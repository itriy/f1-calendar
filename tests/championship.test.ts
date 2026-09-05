import { expect, test } from "vitest";
import {
  estimateChampionshipChances,
  MAX_CONSTRUCTOR_POINTS_PER_RACE,
} from "../src/features/championship/model/championship";

const standings = [
  {
    pos: "1",
    name: "Leader",
    url: "",
    team: "Team A",
    teamUrl: "",
    points: "100",
    code: "leader",
    color: "",
  },
  {
    pos: "2",
    name: "Contender",
    url: "",
    team: "Team B",
    teamUrl: "",
    points: "60",
    code: "contender",
    color: "",
  },
  {
    pos: "3",
    name: "Out",
    url: "",
    team: "Team C",
    teamUrl: "",
    points: "10",
    code: "out",
    color: "",
  },
];

test("keeps only mathematical contenders and distributes a deterministic model index", () => {
  const result = estimateChampionshipChances(standings, 2);
  expect(result.map((item) => item.name)).toEqual(["Leader", "Contender"]);
  expect(result.reduce((total, item) => total + item.estimate, 0)).toBe(100);
});

test("returns no title model once the season is complete", () => {
  expect(estimateChampionshipChances(standings, 0)).toEqual([]);
});

test("uses the two-car maximum for constructor championship contenders", () => {
  const result = estimateChampionshipChances(
    standings.map((item) =>
      item.code === "out" ? { ...item, points: "20" } : item,
    ),
    2,
    MAX_CONSTRUCTOR_POINTS_PER_RACE,
  );
  expect(result.map((item) => item.name)).toEqual([
    "Leader",
    "Contender",
    "Out",
  ]);
  expect(result[0].maximumAvailable).toBe(86);
});
