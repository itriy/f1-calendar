import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, expect, test, vi } from "vitest";
import { i18n, setLocale } from "../src/shared/config/i18n";
import RaceEvents from "../src/entities/race/ui/RaceEvents.vue";
import {
  loadRaceEvents,
  type RaceEvents as EventsResult,
} from "../src/entities/race/api/raceEvents";

vi.mock("../src/entities/race/api/raceEvents", async (original) => ({
  ...(await original<typeof import("../src/entities/race/api/raceEvents")>()),
  loadRaceEvents: vi.fn(),
}));
const load = vi.mocked(loadRaceEvents);
const event = {
  date: "2023-05-28T14:32:00Z",
  message: "YELLOW IN TRACK SECTOR 2",
  flag: "YELLOW",
  scope: "Sector",
  sector: 2,
  lap_number: 40,
};
const mountEvents = () =>
  mount(RaceEvents, {
    props: { season: "2023", date: "2023-05-28" },
    global: { plugins: [i18n] },
  });
beforeEach(async () => {
  load.mockReset();
  await setLocale("uk");
});

test("shows Ukrainian events, explicit UTC time and lap numbers", async () => {
  load.mockResolvedValue({ status: "ready", events: [event] });
  const wrapper = mountEvents();
  await flushPromises();
  expect(wrapper.text()).toContain("Жовтий прапор · Сектор 2");
  expect(wrapper.text()).toContain("Коло 40");
  expect(wrapper.text()).toContain("UTC");
  expect(wrapper.find("time").text()).toBe("14:32");
  wrapper.unmount();
});

test("offers retry on failure and renders an empty result", async () => {
  load
    .mockRejectedValueOnce(new Error("429"))
    .mockResolvedValueOnce({ status: "ready", events: [] });
  const wrapper = mountEvents();
  await flushPromises();
  expect(wrapper.text()).toContain("Не вдалося");
  await wrapper.find("button").trigger("click");
  await flushPromises();
  expect(wrapper.text()).toContain("не знайдено");
  wrapper.unmount();
});

test("ignores a stale response after switching races", async () => {
  let resolve!: (value: EventsResult) => void;
  load
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValueOnce({ status: "unsupported", events: [] });
  const wrapper = mountEvents();
  await wrapper.setProps({ season: "2022", date: "2022-05-29" });
  await flushPromises();
  resolve({ status: "ready", events: [event] });
  await flushPromises();
  expect(wrapper.text()).toContain("з 2023 року");
  expect(wrapper.find("time").exists()).toBe(false);
  wrapper.unmount();
});

test("renders lead changes and separate pit durations with a partial-data retry", async () => {
  load.mockResolvedValue({
    status: "ready",
    partial: true,
    events: [
      {
        date: event.date,
        message: "leader:1:16",
        kind: "leaderChange",
        driver: "Charles Leclerc",
        previousDriver: "Max Verstappen",
      },
      {
        date: event.date,
        message: "pit:1",
        kind: "pit",
        driver: "Max Verstappen",
        laneDuration: 23,
        stopDuration: 2.4,
      },
    ],
  });
  const wrapper = mountEvents();
  await flushPromises();
  expect(wrapper.text()).toContain(
    "Charles Leclerc виходить у лідери. Попередній лідер — Max Verstappen.",
  );
  expect(wrapper.text()).toContain("Зупинка: 2.4 с");
  expect(wrapper.text()).toContain("Час на пітлейні: 23 с");
  expect(wrapper.text()).toContain("Частину додаткових подій");
  wrapper.unmount();
});

test("adds expanded events below a stationary toggle", async () => {
  load.mockResolvedValue({
    status: "ready",
    events: Array.from({ length: 13 }, (_, index) => ({
      ...event,
      date: `2023-05-28T14:${String(index).padStart(2, "0")}:00Z`,
    })),
  });
  const wrapper = mountEvents();
  await flushPromises();

  const button = wrapper.find("button");
  const firstList = wrapper.find("ol");
  expect(firstList.findAll("li")).toHaveLength(12);
  await button.trigger("click");
  await flushPromises();

  const lists = wrapper.findAll("ol");
  expect(lists).toHaveLength(2);
  expect(lists[0].findAll("li")).toHaveLength(12);
  expect(lists[1].findAll("li")).toHaveLength(1);
  expect(
    button.element.compareDocumentPosition(lists[1].element) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  wrapper.unmount();
});
