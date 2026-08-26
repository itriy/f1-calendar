import { expect, test } from "vitest";
import {
  getFallbackFormula1Videos,
  officialYoutubeThumbnailUrl,
  officialYoutubeWatchUrl,
} from "../src/services/formula1Videos";

test("provides only the curated Formula 1 YouTube videos for mapped races", () => {
  expect(getFallbackFormula1Videos("2025", "1")).toEqual([
    {
      id: "md9-jG4RzXs",
      title: "Race Highlights | 2025 Australian Grand Prix",
      kind: "race-highlights",
    },
    {
      id: "Mr7T8TC-cZg",
      title: "Qualifying Highlights | 2025 Australian Grand Prix",
      kind: "qualifying-highlights",
    },
  ]);
  expect(getFallbackFormula1Videos("2025", "8")).toEqual([
    {
      id: "ajzQj7bjSWE",
      title: "Race Highlights | 2025 Monaco Grand Prix",
      kind: "race-highlights",
    },
  ]);
  expect(getFallbackFormula1Videos("2025", "99")).toEqual([]);
});

test("builds official YouTube links only from valid eleven-character video IDs", () => {
  expect(officialYoutubeWatchUrl("md9-jG4RzXs")).toBe(
    "https://www.youtube.com/watch?v=md9-jG4RzXs",
  );
  expect(officialYoutubeThumbnailUrl("md9-jG4RzXs")).toBe(
    "https://i.ytimg.com/vi/md9-jG4RzXs/hqdefault.jpg",
  );
  expect(
    officialYoutubeWatchUrl("https://example.test/not-a-video"),
  ).toBeNull();
  expect(officialYoutubeThumbnailUrl("short")).toBeNull();
});
