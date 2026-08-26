import { expect, test } from "vitest";
import { estimateChampionshipChances } from "../src/utils/championship";

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
