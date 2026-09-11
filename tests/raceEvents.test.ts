import { afterEach, expect, test, vi } from "vitest";
import {
  eventKind,
  loadRaceEvents,
  normalizeRaceEvents,
} from "../src/entities/race/api/raceEvents";

const session = {
  session_key: 9001,
  session_name: "Race",
  date_start: "2023-05-28T13:00:00Z",
  date_end: "2023-05-28T15:00:00Z",
};
const yellow = {
  date: "2023-05-28T14:32:00Z",
  message: "YELLOW IN TRACK SECTOR 2",
  flag: "YELLOW",
  scope: "Sector",
  sector: 2,
  lap_number: 40,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("sorts and deduplicates key events while preserving sector context", () => {
  const green = {
    ...yellow,
    date: "2023-05-28T14:38:00Z",
    flag: "GREEN",
    message: "GREEN IN TRACK SECTOR 2",
  };
  expect(
    normalizeRaceEvents([
      green,
      yellow,
      yellow,
      { date: yellow.date, message: "DRS ENABLED" },
      { ...yellow, date: "invalid" },
    ]),
  ).toEqual([yellow, green]);
  expect(eventKind(green)).toBe("green");
  expect(eventKind({ ...yellow, flag: "GREEN", scope: "Driver" })).toBeNull();
  expect(
    eventKind({ date: yellow.date, message: "VIRTUAL SAFETY CAR ENDING" }),
  ).toBe("vscEnding");
  expect(
    eventKind({
      date: yellow.date,
      message: "10 SECOND TIME PENALTY FOR CAR 11",
    }),
  ).toBe("original");
});

test("does not request unsupported seasons", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect((await loadRaceEvents("2022", "2022-05-29")).status).toBe(
    "unsupported",
  );
  expect(fetch).not.toHaveBeenCalled();
});

test("waits for the free historical window then fetches only the matched race and caches events", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2023-05-28T15:29:59Z"));
  const fetch = vi.fn(async (url: string) =>
    Response.json(url.includes("/sessions?") ? [session] : [yellow]),
  );
  vi.stubGlobal("fetch", fetch);
  expect((await loadRaceEvents("2023", "2023-05-28")).status).toBe("pending");
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date("2023-05-28T15:30:00Z"));
  expect((await loadRaceEvents("2023", "2023-05-28")).events).toEqual([yellow]);
  expect(fetch.mock.calls[2][0]).toContain("race_control?session_key=9001");
  await loadRaceEvents("2023", "2023-05-28");
  expect(fetch).toHaveBeenCalledTimes(6);
});

test("does not use another race or sprint if no exact race matches", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json([
        session,
        {
          ...session,
          session_name: "Sprint",
          date_start: "2023-06-04T13:00:00Z",
        },
      ]),
    ),
  );
  expect((await loadRaceEvents("2023", "2023-06-04")).status).toBe(
    "unavailable",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("failed requests can be retried without a cached rejection", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 429 }))
    .mockResolvedValueOnce(Response.json([]));
  vi.stubGlobal("fetch", fetch);
  await expect(loadRaceEvents("2023", "2023-07-09")).rejects.toThrow("429");
  expect((await loadRaceEvents("2023", "2023-07-09")).status).toBe(
    "unavailable",
  );
});

test("keeps race control and lead changes if the pit feed fails, and retries partial results", async () => {
  const fetch = vi.fn(async (url: string) => {
    if (url.includes("/sessions?"))
      return Response.json([
        {
          ...session,
          session_key: 9002,
          date_start: "2023-08-27T13:00:00Z",
          date_end: "2023-08-27T15:00:00Z",
        },
      ]);
    if (url.includes("/pit?")) return new Response(null, { status: 429 });
    if (url.includes("/position?"))
      return Response.json([
        { date: "2023-08-27T13:00:00Z", driver_number: 1, position: 1 },
        { date: "2023-08-27T14:00:00Z", driver_number: 16, position: 1 },
      ]);
    if (url.includes("/drivers?"))
      return Response.json([
        { driver_number: 16, full_name: "Charles Leclerc" },
      ]);
    return Response.json([{ ...yellow, date: "2023-08-27T14:32:00Z" }]);
  });
  vi.stubGlobal("fetch", fetch);
  const result = await loadRaceEvents("2023", "2023-08-27");
  expect(result.partial).toBe(true);
  expect(result.events).toHaveLength(2);
  expect(result.events[0]).toMatchObject({
    kind: "leaderChange",
    driver: "Charles Leclerc",
    previousDriver: "#1",
  });
  await loadRaceEvents("2023", "2023-08-27");
  expect(fetch).toHaveBeenCalledTimes(10);
});
