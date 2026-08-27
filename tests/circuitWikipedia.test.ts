import { expect, test, vi } from "vitest";
import {
  getCircuitWikipediaArticle,
  loadCircuitMedia,
} from "../src/entities/race/api/circuitWikipedia";

test("derives a decoded title and matching REST endpoint from Jolpica Circuit.url", () => {
  expect(
    getCircuitWikipediaArticle({
      url: "https://en.wikipedia.org/wiki/Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez?oldformat=true#History",
    }),
  ).toEqual({
    title: "Autódromo_Hermanos_Rodríguez",
    sourceUrl:
      "https://en.wikipedia.org/wiki/Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez",
    summaryUrl:
      "https://en.wikipedia.org/api/rest_v1/page/summary/Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez",
  });
});

test.each([
  undefined,
  "",
  "https://example.test/wiki/Circuit",
  "http://en.wikipedia.org/wiki/Circuit",
  "https://en.wikipedia.org/w/index.php?title=Circuit",
  "https://en.wikipedia.org/wiki/%E0%A4%A",
])("rejects absent, non-Wikipedia, or malformed URLs: %s", (url) => {
  expect(getCircuitWikipediaArticle({ url })).toBeNull();
});

test("uses the neutral fallback without fetching when Jolpica has no valid Wikipedia URL", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    loadCircuitMedia({ url: "https://example.test/circuit" }),
  ).resolves.toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

test("keeps the Jolpica Wikipedia page as the source link when the summary has a thumbnail", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          thumbnail: { source: "https://upload.wikimedia.org/circuit.png" },
        }),
        { status: 200 },
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    loadCircuitMedia({
      url: "https://en.wikipedia.org/wiki/Circuit_de_Monaco",
    }),
  ).resolves.toEqual({
    imageUrl: "https://upload.wikimedia.org/circuit.png",
    sourceUrl: "https://en.wikipedia.org/wiki/Circuit_de_Monaco",
  });
  expect(fetchMock).toHaveBeenCalledWith(
    "https://en.wikipedia.org/api/rest_v1/page/summary/Circuit_de_Monaco",
    { headers: { Accept: "application/json" } },
  );
  vi.unstubAllGlobals();
});
