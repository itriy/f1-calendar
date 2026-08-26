import { afterEach, expect, test, vi } from "vitest";
import { loadWeekendDetails } from "../src/services/weekendDetails";

afterEach(() => vi.unstubAllGlobals());

test("combines alpha schedule and classifications with Ergast pit-stop counts", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input.includes("/schedules/2020/"))
        return Response.json({
          data: {
            events: [
              {
                round: { number: 1, is_cancelled: false },
                circuit: { altitude: 42 },
                schedule: [
                  {
                    code: "Q",
                    title: "Qualifying",
                    timestamp: "2020-01-01T10:00:00Z",
                    local_timestamp: "2020-01-01 11:00:00+01:00",
                    timezone: "Europe/Paris",
                    results_url: "https://example.test/q",
                  },
                  {
                    code: "R",
                    title: "Race",
                    timestamp: "2020-01-02T10:00:00Z",
                    local_timestamp: "2020-01-02 11:00:00+01:00",
                    timezone: "Europe/Paris",
                    results_url: "https://example.test/r",
                    laps_url: "https://example.test/laps",
                  },
                ],
              },
            ],
          },
        });
      if (input === "https://example.test/r")
        return Response.json({
          data: {
            results: [
              {
                driver: {
                  abbreviation: "VER",
                  given_name: "Max",
                  family_name: "Verstappen",
                },
                team: { name: "Red Bull" },
                position: 1,
                points: 25,
                components: {
                  GRID: { position: 2 },
                  FLAP: { time: "1:20.000" },
                },
              },
            ],
          },
        });
      if (input === "https://example.test/q")
        return Response.json({
          data: {
            results: [
              {
                driver: {
                  abbreviation: "VER",
                  given_name: "Max",
                  family_name: "Verstappen",
                },
                position: 1,
              },
            ],
          },
        });
      return Response.json({
        MRData: {
          RaceTable: {
            Races: [
              {
                PitStops: [
                  { driverId: "verstappen" },
                  { driverId: "verstappen" },
                ],
              },
            ],
          },
        },
      });
    }),
  );

  const details = await loadWeekendDetails({
    season: "2020",
    round: "1",
    raceName: "Test Grand Prix",
  });
  expect(details.altitude).toBe(42);
  expect(details.results.R?.[0]).toMatchObject({
    driver: "Max Verstappen",
    grid: 2,
    fastestLap: "1:20.000",
  });
  expect(details.results.Q).toHaveLength(1);
  expect(details.pitStops).toEqual([{ driver: "VERSTAPPEN", count: 2 }]);
});
