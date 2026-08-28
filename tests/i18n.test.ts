import { beforeEach, expect, test } from "vitest";
import { i18n, initialLocale, loadLocale, normalizeLocale, setLocale, supportedLocales } from "../src/shared/config/i18n";

beforeEach(() => localStorage.clear());

test("normalizes supported browser locales and falls back to English", () => {
  expect(normalizeLocale("de-AT")).toBe("de");
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
