import type { RaceEvent } from "../api/raceEvents";

export type RacePosition = {
  date: string;
  driver_number: number;
  position: number;
};
export type RaceDriver = {
  driver_number: number;
  full_name?: string;
  name_acronym?: string;
};
export type RacePit = {
  date: string;
  driver_number: number;
  lap_number?: number;
  lane_duration?: number;
  pit_duration?: number;
  stop_duration?: number | null;
};

export function raceHighlights(
  positions: RacePosition[],
  drivers: RaceDriver[],
  pits: RacePit[],
  start: string,
  end: string,
): RaceEvent[] {
  const names = new Map(
    drivers
      .filter((driver) => driver && Number.isInteger(driver.driver_number))
      .map((driver) => [
        driver.driver_number,
        driver.full_name || driver.name_acronym || `#${driver.driver_number}`,
      ]),
  );
  const name = (number: number) => names.get(number) || `#${number}`;
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  const leaders = positions
    .filter(
      (item) =>
        item &&
        item.position === 1 &&
        Number.isInteger(item.driver_number) &&
        item.driver_number > 0 &&
        Number.isFinite(Date.parse(item.date)) &&
        Date.parse(item.date) <= endTime,
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const events: RaceEvent[] = [];
  let leader: number | undefined;
  for (let index = 0; index < leaders.length;) {
    const time = Date.parse(leaders[index].date);
    const sameTime: RacePosition[] = [];
    while (index < leaders.length && Date.parse(leaders[index].date) === time)
      sameTime.push(leaders[index++]);
    // Conflicting simultaneous P1 reports do not establish a reliable leader.
    const numbers = new Set(sameTime.map((item) => item.driver_number));
    if (numbers.size !== 1) {
      leader = undefined;
      continue;
    }
    const current = sameTime[0];
    if (
      time > startTime &&
      leader !== undefined &&
      leader !== current.driver_number
    ) {
      events.push({
        date: current.date,
        message: `leader:${leader}:${current.driver_number}`,
        kind: "leaderChange",
        driver_number: current.driver_number,
        driver: name(current.driver_number),
        previousDriver: name(leader),
      });
    }
    // The first observation establishes a baseline; it is not a lead change.
    leader = current.driver_number;
  }
  for (const pit of pits) {
    if (
      !pit ||
      !Number.isInteger(pit.driver_number) ||
      pit.driver_number <= 0 ||
      !Number.isFinite(Date.parse(pit.date)) ||
      Date.parse(pit.date) < startTime ||
      Date.parse(pit.date) > endTime
    )
      continue;
    const lane = pit.lane_duration ?? pit.pit_duration;
    events.push({
      date: pit.date,
      message: `pit:${pit.driver_number}`,
      kind: "pit",
      driver_number: pit.driver_number,
      driver: name(pit.driver_number),
      lap_number: pit.lap_number,
      laneDuration:
        typeof lane === "number" && lane > 0 && Number.isFinite(lane)
          ? lane
          : undefined,
      stopDuration:
        typeof pit.stop_duration === "number" &&
        pit.stop_duration > 0 &&
        Number.isFinite(pit.stop_duration)
          ? pit.stop_duration
          : undefined,
    });
  }
  return events;
}
