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

test("translates the title-chances section in every supported locale", async () => {
  const ukrainian = i18n.global.getLocaleMessage("uk").chances.title;
  for (const locale of supportedLocales.filter((locale) => locale !== "uk")) {
    await loadLocale(locale);
    expect(i18n.global.getLocaleMessage(locale).chances.title).not.toBe(ukrainian);
  }
});
