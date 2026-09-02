import { beforeEach, expect, test } from "vitest";
import {
  i18n,
  initialLocale,
  loadLocale,
  normalizeLocale,
  setLocale,
  supportedLocales,
} from "../src/shared/config/i18n";
import { serverText } from "../src/shared/config/i18n/server";

beforeEach(() => localStorage.clear());

test("normalizes supported browser locales and falls back to English", () => {
  expect(normalizeLocale("de-AT")).toBe("de");
  expect(normalizeLocale("ru-RU")).toBe("ru");
  expect(normalizeLocale("zh-TW")).toBe("zh-CN");
  expect(normalizeLocale("nl-NL")).toBe("nl-NL");
  expect(normalizeLocale("nl-BE")).toBe("nl-NL");
  expect(normalizeLocale("sq-AL")).toBe("sq-AL");
  expect(normalizeLocale("sq-XK")).toBe("sq-AL");
  expect(normalizeLocale("pl-PL")).toBe("en");
});

test("persists a manually selected locale", async () => {
  await setLocale("ja");
  expect(initialLocale()).toBe("ja");
  expect(document.documentElement.lang).toBe("ja");
});

test("uses the locale encoded in the URL before local storage", async () => {
  localStorage.setItem("f1-calendar-locale", "ja");
  history.replaceState({}, "", "/de/");
  expect(initialLocale()).toBe("de");
  history.replaceState({}, "", "/");
});

test("translates the title-chances section in every supported locale", async () => {
  const ukrainian = (
    i18n.global.getLocaleMessage("uk") as { chances: { title: string } }
  ).chances.title;
  for (const locale of supportedLocales.filter((locale) => locale !== "uk")) {
    await loadLocale(locale);
    expect(
      (i18n.global.getLocaleMessage(locale) as { chances: { title: string } })
        .chances.title,
    ).not.toBe(ukrainian);
  }
});

test("keeps the Russian translation structure and placeholders aligned with Ukrainian", async () => {
  await loadLocale("ru");
  const ukrainian = i18n.global.getLocaleMessage("uk") as Record<
    string,
    unknown
  >;
  const russian = i18n.global.getLocaleMessage("ru") as Record<string, unknown>;
  const leaves = (
    value: Record<string, unknown>,
    prefix = "",
    result: Record<string, string> = {},
  ) => {
    for (const [key, item] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof item === "string") result[path] = item;
      else if (item && typeof item === "object")
        leaves(item as Record<string, unknown>, path, result);
    }
    return result;
  };
  const ukLeaves = leaves(ukrainian);
  const ruLeaves = leaves(russian);
  expect(Object.keys(ruLeaves).sort()).toEqual(Object.keys(ukLeaves).sort());
  for (const key of Object.keys(ukLeaves)) {
    expect(ruLeaves[key].match(/\{\w+\}/g)?.sort() || []).toEqual(
      ukLeaves[key].match(/\{\w+\}/g)?.sort() || [],
    );
  }
});

test("provides Russian server copy for notifications and generated summaries", () => {
  expect(serverText("raceReminder", {}, "ru")).toBe("Напоминание о гонке");
  expect(serverText("scheduledStart", { timing: "за 1 час" }, "ru")).toBe(
    "запланированный старт за 1 час",
  );
  expect(serverText("newsSummaryPrompt", { title: "Новость" }, "ru")).toContain(
    "на русском языке",
  );
});

test("provides Dutch server copy for notifications and generated summaries", () => {
  expect(serverText("raceReminder", {}, "nl-NL")).toBe("Raceherinnering");
  expect(serverText("scheduledStart", { timing: "over 1 uur" }, "nl-NL")).toBe(
    "geplande start over 1 uur",
  );
  expect(
    serverText("newsSummaryPrompt", { title: "Nieuws" }, "nl-NL"),
  ).toContain("Nederlandse zin");
});

test("provides Albanian server copy for notifications and generated summaries", () => {
  expect(serverText("raceReminder", {}, "sq-AL")).toBe("Kujtesë për garën");
  expect(serverText("scheduledStart", { timing: "pas 1 ore" }, "sq-AL")).toBe(
    "nisja e planifikuar pas 1 ore",
  );
  expect(serverText("newsSummaryPrompt", { title: "Lajm" }, "sq-AL")).toContain(
    "shqip",
  );
});
