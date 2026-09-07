import type {
  DatabaseSync as SQLiteDatabase,
  SQLInputValue,
} from "node:sqlite";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { sendPushNotification, WebPushError } from "@mmmike/web-push/send";
import {
  handlePushApi,
  sendDueRaceReminders,
  type D1Database,
  type PushEnv,
} from "../src/server/push";

vi.mock("@mmmike/web-push/send", async (original) => ({
  ...(await original<object>()),
  sendPushNotification: vi.fn(),
}));

const now = Date.parse("2026-09-06T13:00:00Z");
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
let sqlite: SQLiteDatabase;
let env: PushEnv;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.mocked(sendPushNotification).mockReset().mockResolvedValue(true);
  sqlite = new DatabaseSync(":memory:");
  for (const name of [
    "0001_push_reminders",
    "0002_push_schedule_cache",
    "0003_news_feed",
    "0004_news_descriptions",
    "0005_locales",
    "0006_push_delivery_expiry",
  ])
    sqlite.exec(readFileSync(`migrations/${name}.sql`, "utf8"));
  const db: D1Database = {
    prepare(query) {
      const statement = sqlite.prepare(query);
      let values: SQLInputValue[] = [];
      return {
        bind(...args) {
          values = args as SQLInputValue[];
          return this;
        },
        async first<T>() {
          return (statement.get(...values) ?? null) as T | null;
        },
        async all<T>() {
          return { results: statement.all(...values) as T[] };
        },
        async run() {
          return {
            success: true,
            meta: { changes: Number(statement.run(...values).changes) },
          };
        },
      };
    },
  };
  env = {
    PUSH_DB: db,
    VAPID_PUBLIC_KEY: "public",
    VAPID_PRIVATE_KEY: "private",
  };
  sqlite
    .prepare(
      "INSERT INTO push_subscriptions (endpoint, p256dh, auth, remind_day, remind_hour, remind_start, created_at, updated_at) VALUES (?, ?, ?, 0, 0, 1, ?, ?)",
    )
    .run(
      "https://push.example/private-endpoint",
      "p256dh-secret",
      "auth-secret",
      now,
      now,
    );
  sqlite
    .prepare(
      "INSERT INTO push_schedule_cache (id, payload, updated_at) VALUES (1, ?, ?)",
    )
    .run(
      JSON.stringify({
        MRData: {
          RaceTable: {
            season: "2026",
            Races: [
              {
                round: "13",
                raceName: "Test GP",
                date: "2026-09-06",
                time: "13:00:00Z",
              },
            ],
          },
        },
      }),
      now,
    );
});

afterEach(() => {
  sqlite.close();
  vi.restoreAllMocks();
});
const delivery = () => sqlite.prepare("SELECT * FROM push_deliveries").get();

test("reports missing configuration without exposing secrets", async () => {
  delete env.VAPID_PUBLIC_KEY;
  const response = await handlePushApi(
    new Request("https://example.test/api/push/config"),
    env,
  );
  expect(response.status).toBe(503);
  expect(console.error).toHaveBeenCalledWith({
    event: "push_not_configured",
    missing: ["VAPID_PUBLIC_KEY"],
  });
  await sendDueRaceReminders(env, now);
  expect(sendPushNotification).not.toHaveBeenCalled();
});

test("returns the public key when configured", async () => {
  const response = await handlePushApi(
    new Request("https://example.test/api/push/config"),
    env,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ publicKey: "public" });
});

test("sends a start reminder once across repeated cron runs", async () => {
  await sendDueRaceReminders(env, now);
  await sendDueRaceReminders(env, now + 5 * 60_000);
  expect(sendPushNotification).toHaveBeenCalledTimes(1);
  expect(delivery()).toMatchObject({
    status: "sent",
    attempts: 1,
    expires_at: now + 12 * 60_000,
  });
});

test("retries a transient failure without leaking the error body or endpoint", async () => {
  vi.mocked(sendPushNotification).mockRejectedValueOnce(
    new WebPushError(
      "sensitive message",
      503,
      "sensitive body",
      "https://private.example",
    ),
  );
  await sendDueRaceReminders(env, now);
  expect(delivery()).toMatchObject({ status: "pending", attempts: 1 });
  expect(console.error).toHaveBeenCalledWith(
    expect.objectContaining({ event: "push_delivery_failed", statusCode: 503 }),
  );
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
    /sensitive|private\.example/,
  );
  await sendDueRaceReminders(env, now + 4 * 60_000);
  expect(sendPushNotification).toHaveBeenCalledTimes(1);
  await sendDueRaceReminders(env, now + 5 * 60_000);
  expect(delivery()).toMatchObject({ status: "sent", attempts: 2 });
});

test("expires interrupted attempts even without a schedule or push configuration", async () => {
  sqlite
    .prepare(
      "INSERT INTO push_deliveries (subscription_id, race_key, reminder_type, expires_at) VALUES (1, '2025-1', 'start', ?)",
    )
    .run(now - 1);
  delete env.VAPID_PUBLIC_KEY;
  sqlite.exec("DELETE FROM push_schedule_cache");
  await sendDueRaceReminders(env, now);
  expect(delivery()).toMatchObject({ status: "failed" });
  expect(sendPushNotification).not.toHaveBeenCalled();
});

test("does not retry beyond the reminder deadline", async () => {
  vi.mocked(sendPushNotification).mockRejectedValueOnce(
    new WebPushError("busy", 429, "", "https://push.example", "3600"),
  );
  await sendDueRaceReminders(env, now);
  expect(delivery()).toMatchObject({ status: "failed", attempts: 1 });
});

test("does not send past reminders", async () => {
  await sendDueRaceReminders(env, now + 13 * 60_000);
  expect(sendPushNotification).not.toHaveBeenCalled();
});

test("removes expired browser subscriptions", async () => {
  vi.mocked(sendPushNotification).mockResolvedValueOnce(false);
  await sendDueRaceReminders(env, now);
  expect(
    sqlite.prepare("SELECT COUNT(*) AS count FROM push_subscriptions").get(),
  ).toMatchObject({ count: 0 });
});
