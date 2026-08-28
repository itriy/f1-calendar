import { flushPromises, mount } from "@vue/test-utils";
import { expect, test, vi } from "vitest";
import { i18n } from "../src/shared/config/i18n";

vi.mock("../src/entities/race/model/useF1Data", async () => {
  const { ref } = await import("vue");
  return {
    getRaceStart: () => null,
    formatRaceStartLocal: () => "Дата уточнюється",
    useF1Data: () => ({
      season: ref("2026"),
      schedule: ref([]),
      drivers: ref([]),
      driverStandings: ref([]),
      constructors: ref([]),
      loading: ref(true),
      error: ref(""),
      updatedAt: ref(""),
      now: ref(Date.now()),
      upcomingRaces: ref([]),
      nextRace: ref(null),
      remainingRounds: ref(0),
      lastRace: ref(null),
      resultsLoading: ref(false),
      resultsError: ref(""),
      raceHistory: ref([]),
      historyLoading: ref(false),
      historyError: ref(""),
      historySeason: ref("2026"),
      historySeasons: ref([]),
      seasonSummary: ref(null),
      seasonSummaryLoading: ref(false),
      seasonSummaryError: ref(""),
      selectedHistoryRace: ref(null),
      historyDetailsLoading: ref(false),
      historyDetailsError: ref(""),
      load: vi.fn(),
      loadLastResults: vi.fn(),
      loadRaceHistory: vi.fn(),
      loadSeasonSummary: vi.fn(),
      loadHistoryRaceDetails: vi.fn(),
      closeHistoryRaceDetails: vi.fn(),
    }),
  };
});

vi.mock("@/entities/race/api/circuitWikipedia", () => ({
  loadCircuitMedia: vi
    .fn()
    .mockResolvedValue({
      imageUrl: "https://example.test/circuit.png",
      sourceUrl: "https://en.wikipedia.org/wiki/Circuit_de_Monaco",
    }),
}));

import App from "../src/app/App.vue";
import NextRaceCircuit from "../src/widgets/race-calendar/ui/NextRaceCircuit.vue";
import RaceCalendar from "../src/widgets/race-calendar/ui/RaceCalendar.vue";

const circuit = {
  circuitId: "monaco",
  circuitName: "Circuit de Monaco",
  url: "https://en.wikipedia.org/wiki/Circuit_de_Monaco",
  Location: {
    locality: "Monaco",
    country: "Monaco",
    lat: "43.7347",
    long: "7.4206",
  },
};
const race = {
  round: "13",
  raceName: "Гран-прі Монако",
  date: "2026-06-07",
  time: "13:00:00Z",
  Circuit: circuit,
  flag: "🇲🇨",
};

test("hero heading renders the punctuation supplied by i18n without appending a period", () => {
  const messages = i18n.global.getLocaleMessage("uk") as {
    app: Record<string, string>;
  };
  const original = messages.app.headlineEnd;
  i18n.global.setLocaleMessage("uk", {
    ...messages,
    app: { ...messages.app, headlineEnd: "гонки?!" },
  });
  const wrapper = mount(App, { global: { plugins: [i18n] } });
  expect(wrapper.find("h1").text()).toContain("гонки?!");
  expect(wrapper.find("h1").text()).not.toContain("гонки?!.");
  i18n.global.setLocaleMessage("uk", {
    ...messages,
    app: { ...messages.app, headlineEnd: original },
  });
});

test("calendar renders every supplied upcoming round, including the final one", () => {
  const races = Array.from({ length: 11 }, (_, index) => ({
    ...race,
    round: String(index + 13),
    raceName: `Гран-прі ${index + 13}`,
  }));
  const wrapper = mount(RaceCalendar, {
    props: { races },
    global: { plugins: [i18n] },
  });
  expect(wrapper.text()).toContain("Гран-прі 23");
  expect(wrapper.findAll("article")).toHaveLength(11);
});

test("circuit accordion and media preview open and close with click and keyboard", async () => {
  const wrapper = mount(NextRaceCircuit, {
    props: { race },
    global: { plugins: [i18n] },
  });
  const accordion = wrapper.get("button");
  expect(accordion.attributes("aria-expanded")).toBe("false");
  await accordion.trigger("click");
  await flushPromises();
  expect(accordion.attributes("aria-expanded")).toBe("true");
  const preview = wrapper.get('[aria-controls="circuit-media-preview"]');
  await preview.trigger("click");
  await flushPromises();
  expect(preview.attributes("aria-expanded")).toBe("true");
  expect(wrapper.find("#circuit-media-preview").exists()).toBe(true);
  await preview.trigger("keydown", { key: "Escape" });
  expect(preview.attributes("aria-expanded")).toBe("false");
  expect(wrapper.find("#circuit-media-preview").exists()).toBe(false);
});
