import { expect, test } from "vitest";
import {
  getRaceStart,
  getUpcomingRaces,
} from "../src/entities/race/model/useF1Data";

test("keeps every future round shown in the schedule, including the eleventh", () => {
  const races = Array.from({ length: 11 }, (_, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, "0")}`,
    time: "12:00:00Z",
    round: String(index + 13),
  }));
  const future = getUpcomingRaces(races, Date.parse("2026-09-30T00:00:00Z"));
  expect(future).toHaveLength(11);
  expect(future.at(-1)?.round).toBe("23");
});

test("uses an API-provided timezone offset when determining the race start", () => {
  expect(
    getRaceStart({ date: "2026-09-06", time: "15:00:00+02:00" })?.toISOString(),
  ).toBe("2026-09-06T13:00:00.000Z");
});
