import { expect, test } from "vitest";
import { mount } from "@vue/test-utils";
import { isLiveStandingsWindow } from "../src/entities/race/model/useF1Data";
import { handleLiveStandings } from "../src/server/liveStandings";
import StandingsTable from "../src/widgets/standings/ui/StandingsTable.vue";
import { i18n } from "../src/shared/config/i18n";

test("returns a best-effort SignalR snapshot without caching it", async () => {
  const response = await handleLiveStandings(
    new Request("https://example.test/api/live-f1"),
    {
      idFromName: () => "live",
      get: () => ({
        getSnapshot: async () => ({
          source: "signalr" as const,
          sessionStatus: "finished" as const,
          sessionName: "Italian Grand Prix",
          sessionType: "race" as const,
          updatedAt: "2026-09-06T16:00:00.000Z",
          stale: false,
          results: [],
        }),
      }),
    },
  );
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  await expect(response.json()).resolves.toMatchObject({ source: "signalr" });
});

test("does not make live timing unavailable fatal", async () => {
  const response = await handleLiveStandings(new Request("https://example.test/api/live-f1"), undefined);
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toBeNull();
});

test("keeps the live standings window open for a day after race start", () => {
  const race = { date: "2026-09-06", time: "13:00:00Z" };
  expect(isLiveStandingsWindow([race], Date.parse("2026-09-06T13:00:00Z"))).toBe(true);
  expect(isLiveStandingsWindow([race], Date.parse("2026-09-07T12:59:59Z"))).toBe(true);
  expect(isLiveStandingsWindow([race], Date.parse("2026-09-07T13:00:00Z"))).toBe(false);
});

test("labels a SignalR standings snapshot as live data", () => {
  const wrapper = mount(StandingsTable, {
    props: { drivers: [], constructors: [], source: "signalr", updatedAt: "17:18" },
    global: { plugins: [i18n] },
  });
  expect(wrapper.text()).toContain("Оперативні дані · оновлено 17:18");
});
