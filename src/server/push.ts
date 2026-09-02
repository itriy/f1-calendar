import {
  sendPushNotification,
  WebPushError,
  type PushSubscriptionData,
} from "@mmmike/web-push/send";
import { requestLocale, serverText } from "@/shared/config/i18n/server";
import type { SupportedLocale } from "@/shared/config/i18n";

export type D1Result = { success: boolean; meta?: { changes?: number } };
export type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<D1Result>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
};
export type D1Database = { prepare(query: string): D1Statement };

export type PushEnv = {
  PUSH_DB?: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
};
type Preferences = { day: boolean; hour: boolean; start: boolean };
type StoredSubscription = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  remind_day: number;
  remind_hour: number;
  remind_start: number;
  locale: SupportedLocale;
};
type Delivery = {
  id: number;
  status: string;
  attempts: number;
  next_attempt_at: number;
};

const MAX_BODY_BYTES = 4096;
const JOLPICA_URL = "https://api.jolpi.ca/ergast/f1/current.json";
const SCHEDULE_TTL_MS = 6 * 60 * 60_000;
const text = new TextEncoder();

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
function failure(code: string, message: string, status: number) {
  return response({ error: { code, message } }, status);
}

async function parseBody(request: Request): Promise<unknown> {
  const size = Number(request.headers.get("content-length") || 0);
  if (size > MAX_BODY_BYTES) throw new RangeError("body");
  const raw = await request.text();
  if (text.encode(raw).byteLength > MAX_BODY_BYTES)
    throw new RangeError("body");
  return JSON.parse(raw);
}

function preferences(value: unknown): Preferences | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.day !== "boolean" ||
    typeof record.hour !== "boolean" ||
    typeof record.start !== "boolean"
  )
    return null;
  return { day: record.day, hour: record.hour, start: record.start };
}

function subscription(value: unknown): PushSubscriptionData | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = record.keys as Record<string, unknown> | undefined;
  if (
    typeof record.endpoint !== "string" ||
    !keys ||
    typeof keys.p256dh !== "string" ||
    typeof keys.auth !== "string"
  )
    return null;
  try {
    if (new URL(record.endpoint).protocol !== "https:") return null;
  } catch {
    return null;
  }
  if (
    record.endpoint.length > 2048 ||
    keys.p256dh.length > 256 ||
    keys.auth.length > 128
  )
    return null;
  return {
    endpoint: record.endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

function configured(env: PushEnv): Response | null {
  if (!env.PUSH_DB || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY)
    return failure("not_configured", serverText("remindersNotConfigured"), 503);
  return null;
}

export async function handlePushApi(
  request: Request,
  env: PushEnv,
): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: { Allow: "GET, POST, PATCH, DELETE, OPTIONS" },
    });
  if (request.method === "GET")
    return env.VAPID_PUBLIC_KEY
      ? response({ publicKey: env.VAPID_PUBLIC_KEY })
      : failure("not_configured", serverText("remindersNotConfigured"), 503);
  const missing = configured(env);
  if (missing) return missing;
  let body: Record<string, unknown>;
  try {
    body = (await parseBody(request)) as Record<string, unknown>;
  } catch (cause) {
    return cause instanceof RangeError
      ? failure("payload_too_large", serverText("payloadTooLarge"), 413)
      : failure("invalid_request", serverText("invalidRequest"), 400);
  }
  const sub = subscription(body.subscription ?? body);
  const prefs = preferences(body.preferences);
  const locale = requestLocale(request, body.locale);
  if (!sub)
    return failure(
      "invalid_subscription",
      serverText("invalidSubscription"),
      400,
    );
  const now = Date.now();
  if (request.method === "DELETE") {
    await env
      .PUSH_DB!.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
      .bind(sub.endpoint)
      .run();
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (!prefs && request.method !== "PATCH")
    return failure(
      "invalid_preferences",
      serverText("invalidPreferences"),
      400,
    );
  if (request.method === "POST") {
    await env
      .PUSH_DB!.prepare(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth, remind_day, remind_hour, remind_start, locale, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, remind_day=excluded.remind_day, remind_hour=excluded.remind_hour, remind_start=excluded.remind_start, locale=excluded.locale, updated_at=excluded.updated_at`,
      )
      .bind(
        sub.endpoint,
        sub.keys.p256dh,
        sub.keys.auth,
        Number(prefs.day),
        Number(prefs.hour),
        Number(prefs.start),
        locale,
        now,
        now,
      )
      .run();
    return response({ ok: true }, 201);
  }
  if (request.method === "PATCH") {
    if (!prefs) {
      const result = await env
        .PUSH_DB!.prepare(
          "UPDATE push_subscriptions SET locale=?, updated_at=? WHERE endpoint=?",
        )
        .bind(locale, now, sub.endpoint)
        .run();
      return result.meta?.changes
        ? response({ ok: true })
        : failure(
            "not_found",
            serverText("subscriptionNotFound", {}, locale),
            404,
          );
    }
    const result = await env
      .PUSH_DB!.prepare(
        "UPDATE push_subscriptions SET remind_day=?, remind_hour=?, remind_start=?, locale=?, updated_at=? WHERE endpoint=?",
      )
      .bind(
        Number(prefs.day),
        Number(prefs.hour),
        Number(prefs.start),
        locale,
        now,
        sub.endpoint,
      )
      .run();
    return result.meta?.changes
      ? response({ ok: true })
      : failure("not_found", serverText("subscriptionNotFound"), 404);
  }
  return failure("method_not_allowed", serverText("methodNotAllowed"), 405);
}

type ScheduledRace = {
  raceName?: string;
  round?: string;
  date?: string;
  time?: string;
  Circuit?: { Location?: { locality?: string } };
};
function startAt(race: ScheduledRace) {
  if (!race.date || !race.time) return null;
  const time = race.time.endsWith("Z") ? race.time : `${race.time}Z`;
  const date = new Date(`${race.date}T${time}`);
  return Number.isNaN(date.getTime()) ? null : date;
}
function due(now: number, target: number) {
  return now >= target - 2 * 60_000 && now <= target + 12 * 60_000;
}

async function claimDelivery(
  db: D1Database,
  subscriptionId: number,
  raceKey: string,
  type: string,
  now: number,
): Promise<Delivery | null> {
  await db
    .prepare(
      "INSERT OR IGNORE INTO push_deliveries (subscription_id, race_key, reminder_type, next_attempt_at) VALUES (?, ?, ?, 0)",
    )
    .bind(subscriptionId, raceKey, type)
    .run();
  const row = await db
    .prepare(
      "SELECT id, status, attempts, next_attempt_at FROM push_deliveries WHERE subscription_id=? AND race_key=? AND reminder_type=?",
    )
    .bind(subscriptionId, raceKey, type)
    .first<Delivery>();
  if (!row || row.status !== "pending" || row.next_attempt_at > now)
    return null;
  const claimed = await db
    .prepare(
      "UPDATE push_deliveries SET attempts=attempts+1, next_attempt_at=? WHERE id=? AND status='pending' AND next_attempt_at<=?",
    )
    .bind(now + 5 * 60_000, row.id, now)
    .run();
  return claimed.meta?.changes ? { ...row, attempts: row.attempts + 1 } : null;
}

async function deliver(
  env: PushEnv,
  sub: StoredSubscription,
  raceKey: string,
  type: "day" | "hour" | "start",
  race: ScheduledRace,
  now: number,
) {
  const claim = await claimDelivery(env.PUSH_DB!, sub.id, raceKey, type, now);
  if (!claim) return;
  const timing =
    type === "day"
      ? serverText("reminderDay", {}, sub.locale)
      : type === "hour"
        ? serverText("reminderHour", {}, sub.locale)
        : serverText("reminderNow", {}, sub.locale);
  try {
    const sent = await sendPushNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      {
        title:
          type === "start"
            ? serverText("raceStarted", {}, sub.locale)
            : serverText("raceReminder", {}, sub.locale),
        body: `${race.raceName || serverText("f1Round", {}, sub.locale)} - ${type === "start" ? serverText("scheduledStartNow", {}, sub.locale) : serverText("scheduledStart", { timing }, sub.locale)}.`,
        url: "/",
        tag: `race-${raceKey}-${type}`,
      },
      {
        publicKey: env.VAPID_PUBLIC_KEY!,
        privateKey: env.VAPID_PRIVATE_KEY!,
        subject: env.VAPID_SUBJECT || "mailto:admin@f1-calendar.local",
      },
      { ttl: 900, urgency: "high", timeoutMs: 10_000 },
    );
    if (!sent) {
      await env
        .PUSH_DB!.prepare("DELETE FROM push_subscriptions WHERE id=?")
        .bind(sub.id)
        .run();
      return;
    }
    await env
      .PUSH_DB!.prepare(
        "UPDATE push_deliveries SET status='sent', delivered_at=? WHERE id=?",
      )
      .bind(now, claim.id)
      .run();
  } catch (cause) {
    const retry =
      cause instanceof WebPushError && cause.retryAfterMs
        ? Math.min(cause.retryAfterMs, 60 * 60_000)
        : 5 * 60_000;
    const status = claim.attempts >= 3 ? "failed" : "pending";
    await env
      .PUSH_DB!.prepare(
        "UPDATE push_deliveries SET status=?, next_attempt_at=? WHERE id=?",
      )
      .bind(status, now + retry, claim.id)
      .run();
  }
}

export async function sendDueRaceReminders(env: PushEnv, now = Date.now()) {
  if (!env.PUSH_DB || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  const cached = await env.PUSH_DB.prepare(
    "SELECT payload, updated_at FROM push_schedule_cache WHERE id=1",
  ).first<{ payload: string; updated_at: number }>();
  let data: unknown;
  if (cached && now - cached.updated_at < SCHEDULE_TTL_MS)
    data = JSON.parse(cached.payload);
  else {
    try {
      data = await fetch(JOLPICA_URL, {
        headers: { Accept: "application/json" },
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("schedule"))));
      await env.PUSH_DB.prepare(
        "INSERT INTO push_schedule_cache (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
      )
        .bind(JSON.stringify(data), now)
        .run();
    } catch {
      if (!cached) return;
      data = JSON.parse(cached.payload);
    }
  }
  const races = (
    data as {
      MRData?: { RaceTable?: { season?: string; Races?: ScheduledRace[] } };
    }
  ).MRData?.RaceTable;
  if (!races?.Races) return;
  const subs = await env.PUSH_DB.prepare(
    "SELECT id, endpoint, p256dh, auth, remind_day, remind_hour, remind_start, locale FROM push_subscriptions",
  ).all<StoredSubscription>();
  for (const race of races.Races) {
    const start = startAt(race);
    if (!start || start.getTime() < now - 15 * 60_000) continue;
    const raceKey = `${races.season || start.getUTCFullYear()}-${race.round || start.toISOString()}`;
    const types: Array<{
      type: "day" | "hour" | "start";
      target: number;
      enabled: keyof Pick<
        StoredSubscription,
        "remind_day" | "remind_hour" | "remind_start"
      >;
    }> = [
      {
        type: "day",
        target: start.getTime() - 24 * 60 * 60_000,
        enabled: "remind_day",
      },
      {
        type: "hour",
        target: start.getTime() - 60 * 60_000,
        enabled: "remind_hour",
      },
      { type: "start", target: start.getTime(), enabled: "remind_start" },
    ];
    for (const item of types)
      if (due(now, item.target))
        await Promise.allSettled(
          subs.results
            .filter((sub) => sub[item.enabled] === 1)
            .map((sub) => deliver(env, sub, raceKey, item.type, race, now)),
        );
  }
}
