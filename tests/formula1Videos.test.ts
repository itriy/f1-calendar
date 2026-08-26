import { expect, test } from "vitest";
import {
  getFallbackFormula1Videos,
  officialYoutubeEmbedUrl,
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

test("builds privacy-enhanced embeds only from valid eleven-character YouTube IDs", () => {
  expect(officialYoutubeEmbedUrl("md9-jG4RzXs")).toBe(
    "https://www.youtube-nocookie.com/embed/md9-jG4RzXs",
  );
  expect(
    officialYoutubeEmbedUrl("https://example.test/not-a-video"),
  ).toBeNull();
  expect(officialYoutubeEmbedUrl("short")).toBeNull();
});
