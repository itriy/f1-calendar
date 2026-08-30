import type { StandingDriver } from "@/entities/race/model/types";

export const MAX_POINTS_PER_RACE = 25;

export interface TitleContender extends StandingDriver {
  gap: number;
  estimate: number;
  maximumAvailable: number;
}

export function estimateChampionshipChances(
  standings: StandingDriver[],
  remainingRounds: number,
  maxPointsPerRace = MAX_POINTS_PER_RACE,
): TitleContender[] {
  if (
    !Array.isArray(standings) ||
    !standings.length ||
    !Number.isInteger(remainingRounds) ||
    remainingRounds <= 0
  )
    return [];
  const leaderPoints = Number(standings[0].points);
  const maximumAvailable = remainingRounds * maxPointsPerRace;
  const contenders = standings
    .map((driver) => ({ ...driver, gap: leaderPoints - Number(driver.points) }))
    .filter((driver) => driver.gap <= maximumAvailable)
    .slice(0, 6);
  const weights = contenders.map((driver) =>
    Math.max(1, maximumAvailable - driver.gap + 1),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let allocated = 0;
  return contenders.map((driver, index) => {
    const estimate =
      index === contenders.length - 1
        ? 100 - allocated
        : Math.round((weights[index] / totalWeight) * 100);
    allocated += estimate;
    return { ...driver, estimate, maximumAvailable };
  });
}
