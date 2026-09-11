import { expect, test } from "vitest";
import { raceHighlights } from "../src/entities/race/model/raceHighlights";
const start = "2023-11-19T06:00:00Z";
const end = "2023-11-19T08:00:00Z";
const drivers = [
  { driver_number: 1, full_name: "Max Verstappen" },
  { driver_number: 16, full_name: "Charles Leclerc" },
];
const position = (date: string, driver_number: number) => ({
  date,
  driver_number,
  position: 1,
});

test("uses the initial leader as baseline and includes genuine changes in chronological order", () => {
  const events = raceHighlights(
    [
      position("2023-11-19T07:10:00Z", 1),
      position("2023-11-19T05:50:00Z", 16),
      position("2023-11-19T06:05:00Z", 1),
      position("2023-11-19T06:06:00Z", 1),
      position("2023-11-19T06:55:00Z", 16),
      position("2023-11-19T08:05:00Z", 16),
    ],
    drivers,
    [],
    start,
    end,
  );
  expect(events.map((event) => [event.driver, event.previousDriver])).toEqual([
    ["Max Verstappen", "Charles Leclerc"],
    ["Charles Leclerc", "Max Verstappen"],
    ["Max Verstappen", "Charles Leclerc"],
  ]);
});

test("does not invent a change for the first observation or ambiguous simultaneous leaders", () => {
  const events = raceHighlights(
    [
      position("2023-11-19T06:05:00Z", 1),
      position("2023-11-19T06:06:00Z", 1),
      position("2023-11-19T06:06:00Z", 16),
      position("2023-11-19T06:07:00Z", 16),
      position("invalid", 1),
    ],
    drivers,
    [],
    start,
    end,
  );
  expect(events).toEqual([]);
});

test("keeps pit lane duration distinct from stationary time and falls back to driver numbers", () => {
  const events = raceHighlights(
    [],
    [],
    [
      {
        date: "2023-11-19T06:30:00Z",
        driver_number: 11,
        pit_duration: 23.2,
        lap_number: 20,
      },
      {
        date: "2023-11-19T06:40:00Z",
        driver_number: 1,
        lane_duration: 22,
        stop_duration: 2.3,
      },
      { date: "invalid", driver_number: 1 },
      { date: "2023-11-19T05:30:00Z", driver_number: 1 },
    ],
    start,
    end,
  );
  expect(events).toHaveLength(2);
  expect(events[0]).toMatchObject({
    kind: "pit",
    driver: "#11",
    laneDuration: 23.2,
    lap_number: 20,
  });
  expect(events[0].stopDuration).toBeUndefined();
  expect(events[1]).toMatchObject({ laneDuration: 22, stopDuration: 2.3 });
});
