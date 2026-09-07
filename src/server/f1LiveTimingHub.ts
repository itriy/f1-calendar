import type { LiveResult, LiveTimingSnapshot } from "@/entities/race/api/openf1";
import { DurableObject } from "cloudflare:workers";

type Storage = {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  setAlarm(scheduledTime: number | Date): Promise<void>;
};
type DurableObjectState = { storage: Storage };
type WorkerWebSocket = WebSocket & { accept(): void };
type WebSocketResponse = Response & { webSocket?: WorkerWebSocket };
type Driver = { name: string; team: string; number: string };
type TimingLine = { Position?: string | number; GapToLeader?: string; Status?: string | number };
type StoredSnapshot = LiveTimingSnapshot & { demandUntil: number };

const SIGNALR_ORIGIN = "https://livetiming.formula1.com";
const SIGNALR_PATH = "/signalrcore";
const RECORD_SEPARATOR = "\u001e";
const TOPICS = ["DriverList", "SessionInfo", "SessionStatus", "TimingData", "TimingStats", "LapCount", "RaceControlMessages"];
const STALE_AFTER_MS = 25_000;
const DEMAND_TTL_MS = 2 * 60_000;
const RECONNECT_DELAY_MS = 5_000;

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
function statusFrom(value: string): LiveTimingSnapshot["sessionStatus"] {
  const normalized = value.toLowerCase();
  if (["finished", "finalised", "finalized", "aborted"].includes(normalized)) return "finished";
  if (["started", "green", "suspended", "ends"].includes(normalized)) return "live";
  return "inactive";
}
function sessionType(name: string): LiveTimingSnapshot["sessionType"] {
  const normalized = name.toLowerCase();
  if (normalized.includes("sprint")) return "sprint";
  if (normalized.includes("race")) return "race";
  return "unknown";
}
function cookieFrom(headers: Headers): string {
  const match = (headers.get("set-cookie") || "").match(/AWSALBCORS=[^;]+/i);
  return match?.[0] || "";
}

/** Best-effort bridge; it never authenticates as a Formula 1 user. */
export class F1LiveTimingHub extends DurableObject {
  private socket: WorkerWebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private snapshot: StoredSnapshot | null = null;
  private drivers = new Map<string, Driver>();
  private timing = new Map<string, TimingLine>();

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
  }

  async getSnapshot(active: boolean): Promise<LiveTimingSnapshot | null> {
    await this.load();
    if (active) {
      await this.markDemand();
      void this.connect();
    }
    return this.publicSnapshot();
  }

  async alarm(): Promise<void> {
    await this.load();
    if (!this.snapshot || this.snapshot.demandUntil <= Date.now()) return this.close();
    await this.connect();
  }

  private async load() {
    if (this.snapshot) return;
    this.snapshot = (await this.ctx.storage.get<StoredSnapshot>("snapshot")) || null;
  }
  private async markDemand() {
    if (!this.snapshot) this.snapshot = this.emptySnapshot();
    this.snapshot.demandUntil = Date.now() + DEMAND_TTL_MS;
    await this.persist();
    await this.ctx.storage.setAlarm(this.snapshot.demandUntil);
  }
  private publicSnapshot(): LiveTimingSnapshot | null {
    if (!this.snapshot?.updatedAt || !this.snapshot.results.length) return null;
    return {
      source: this.snapshot.source,
      sessionStatus: this.snapshot.sessionStatus,
      sessionName: this.snapshot.sessionName,
      sessionType: this.snapshot.sessionType,
      updatedAt: this.snapshot.updatedAt,
      stale: Date.now() - Date.parse(this.snapshot.updatedAt) > STALE_AFTER_MS,
      results: this.snapshot.results,
    };
  }
  private emptySnapshot(): StoredSnapshot {
    return { source: "signalr", sessionStatus: "inactive", sessionName: "", sessionType: "unknown", updatedAt: "", stale: true, results: [], demandUntil: 0 };
  }
  private async connect(): Promise<void> {
    if (this.socket || this.connecting) return this.connecting || Promise.resolve();
    this.connecting = this.open().finally(() => { this.connecting = null; });
    return this.connecting;
  }
  private async open() {
    try {
      const negotiation = await fetch(`${SIGNALR_ORIGIN}${SIGNALR_PATH}/negotiate?negotiateVersion=1`, {
        method: "POST", headers: { "User-Agent": "F1Calendar/1.0", "X-Requested-With": "XMLHttpRequest", Origin: "https://www.formula1.com" },
      });
      if (!negotiation.ok) throw new Error(`SignalR negotiate ${negotiation.status}`);
      const body = (await negotiation.json()) as { connectionToken?: string };
      if (!body.connectionToken) throw new Error("SignalR negotiation has no connection token");
      const url = new URL(`${SIGNALR_ORIGIN}${SIGNALR_PATH}`);
      url.searchParams.set("id", body.connectionToken);
      const cookie = cookieFrom(negotiation.headers);
      const response = (await fetch(url, { headers: { Upgrade: "websocket", Connection: "Upgrade", Origin: "https://www.formula1.com", ...(cookie ? { Cookie: cookie } : {}) } })) as WebSocketResponse;
      if (response.status !== 101 || !response.webSocket) throw new Error(`SignalR websocket ${response.status}`);
      const socket = response.webSocket;
      socket.accept();
      this.socket = socket;
      socket.addEventListener("message", (event) => this.onMessage(text(event.data)));
      socket.addEventListener("close", () => this.onClose());
      socket.addEventListener("error", () => this.onClose());
      socket.send(`${JSON.stringify({ protocol: "json", version: 1 })}${RECORD_SEPARATOR}`);
      socket.send(`${JSON.stringify({ type: 1, target: "Subscribe", arguments: [TOPICS] })}${RECORD_SEPARATOR}`);
    } catch (cause) {
      console.warn("F1 SignalR connection unavailable", cause);
      await this.scheduleReconnect();
    }
  }
  private onClose() { this.socket = null; void this.scheduleReconnect(); }
  private async scheduleReconnect() {
    await this.load();
    if (this.snapshot?.demandUntil && this.snapshot.demandUntil > Date.now()) await this.ctx.storage.setAlarm(Date.now() + RECONNECT_DELAY_MS);
  }
  private close() {
    const socket = this.socket;
    this.socket = null;
    try { socket?.close(1000, "No live clients"); } catch { /* noop */ }
  }
  private onMessage(raw: string) {
    for (const record of raw.split(RECORD_SEPARATOR)) {
      if (!record) continue;
      try {
        const message = JSON.parse(record) as { target?: string; arguments?: unknown[] };
        if (message.target !== "feed" || !Array.isArray(message.arguments)) continue;
        const [topic, payload] = message.arguments;
        this.ingest(text(topic), payload);
      } catch { /* malformed provider frame */ }
    }
  }
  private ingest(topic: string, payload: unknown) {
    if (topic === "DriverList") this.ingestDrivers(payload);
    if (topic === "TimingData") this.ingestTiming(payload);
    if (topic === "SessionInfo") {
      const info = payload as { Name?: unknown; Type?: unknown };
      if (!this.snapshot) this.snapshot = this.emptySnapshot();
      this.snapshot.sessionName = text(info?.Name) || text(info?.Type) || this.snapshot.sessionName;
      this.snapshot.sessionType = sessionType(this.snapshot.sessionName);
    }
    if (topic === "SessionStatus") {
      const status = payload as { Status?: unknown };
      if (!this.snapshot) this.snapshot = this.emptySnapshot();
      this.snapshot.sessionStatus = statusFrom(text(status?.Status));
    }
    if (["TimingData", "SessionStatus", "SessionInfo"].includes(topic)) { this.refreshResults(); void this.persist(); }
  }
  private ingestDrivers(payload: unknown) {
    for (const [key, value] of Object.entries((payload || {}) as Record<string, unknown>)) {
      const driver = value as { FullName?: unknown; TeamName?: unknown; RacingNumber?: unknown };
      const number = text(driver.RacingNumber) || key;
      const name = text(driver.FullName);
      if (name) this.drivers.set(number, { number, name, team: text(driver.TeamName) || "-" });
    }
  }
  private ingestTiming(payload: unknown) {
    const lines = (payload as { Lines?: Record<string, TimingLine> })?.Lines || {};
    for (const [number, line] of Object.entries(lines)) this.timing.set(number, { ...(this.timing.get(number) || {}), ...line });
  }
  private refreshResults() {
    if (!this.snapshot) this.snapshot = this.emptySnapshot();
    const results: LiveResult[] = [];
    for (const [number, line] of this.timing) {
      const position = text(line.Position);
      const driver = this.drivers.get(number);
      if (!driver || !/^\d+$/.test(position)) continue;
      results.push({ position, name: driver.name, team: driver.team, driverNumber: number, status: text(line.Status), gap: text(line.GapToLeader) });
    }
    this.snapshot.results = results.sort((a, b) => Number(a.position) - Number(b.position));
    if (results.length) this.snapshot.updatedAt = new Date().toISOString();
  }
  private async persist() { if (this.snapshot) await this.ctx.storage.put("snapshot", this.snapshot); }
}
