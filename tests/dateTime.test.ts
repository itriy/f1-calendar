import { afterEach, expect, test, vi } from "vitest";
import { formatDateTime } from "../src/shared/lib/dateTime";

afterEach(() => vi.restoreAllMocks());

test("formats Albanian dates when the runtime lacks the locale", () => {
  vi.spyOn(Intl.DateTimeFormat, "supportedLocalesOf").mockReturnValue([]);

  expect(
    formatDateTime(new Date("2026-09-06T12:00:00Z"), "sq-AL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }),
  ).toBe("e diel, 6 shtator");
});

test("keeps native formatting for other locales", () => {
  expect(
    formatDateTime(new Date("2026-09-06T12:00:00Z"), "nl-NL", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }),
  ).toBe("6 september");
});
