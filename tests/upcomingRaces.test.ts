import { expect, test } from "vitest";
import { getUpcomingRaces } from "../src/entities/race/model/useF1Data";

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
