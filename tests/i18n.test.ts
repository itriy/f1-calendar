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
  expect(serverText("raceReminder", {}, "ru")).toBe(
    "Напоминание о гонке",
  );
  expect(serverText("scheduledStart", { timing: "за 1 час" }, "ru")).toBe(
    "запланированный старт за 1 час",
  );
  expect(serverText("newsSummaryPrompt", { title: "Новость" }, "ru"))
    .toContain("на русском языке");
});
