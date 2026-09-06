import { createI18n } from "vue-i18n";
import type ukMessages from "./locales/uk.json";
import enMessages from "./locales/en.json";
import { localeFromPathname } from "@/shared/config/seo";

export const supportedLocales = [
  "uk",
  "ru",
  "en",
  "de",
  "fr",
  "es",
  "it",
  "ja",
  "zh-CN",
  "nl-NL",
  "sq-AL",
  "pl",
  "cs",
  "az",
] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const localeLabels: Record<SupportedLocale, string> = {
  uk: "Українська",
  ru: "Русский",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  ja: "日本語",
  "zh-CN": "简体中文",
  "nl-NL": "Nederlands",
  "sq-AL": "Shqip",
  pl: "Polski",
  cs: "Čeština",
  az: "Azərbaycan dili",
};
export const localeShortLabels: Record<SupportedLocale, string> = {
  uk: "UA",
  ru: "RU",
  en: "EN",
  de: "DE",
  fr: "FR",
  es: "ES",
  it: "IT",
  ja: "JA",
  "zh-CN": "中文",
  "nl-NL": "NL",
  "sq-AL": "SQ",
  pl: "PL",
  cs: "CS",
  az: "AZ",
};
const LOCALE_STORAGE_KEY = "f1-calendar-locale";
export function normalizeLocale(value?: string | null): SupportedLocale {
  const candidate = value?.replace("_", "-");
  if (candidate === "zh-CN" || candidate?.toLowerCase().startsWith("zh"))
    return "zh-CN";
  if (candidate?.toLowerCase().startsWith("nl")) return "nl-NL";
  if (candidate?.toLowerCase().startsWith("sq")) return "sq-AL";
  const language = candidate?.split("-")[0]?.toLowerCase();
  return supportedLocales.includes(language as SupportedLocale)
    ? (language as SupportedLocale)
    : "en";
}
export function initialLocale(): SupportedLocale {
  if (typeof window === "undefined") return "en";
  const localeInUrl = localeFromPathname(window.location.pathname);
  if (localeInUrl) return localeInUrl;
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved) return normalizeLocale(saved);
  return normalizeLocale(navigator.languages?.[0] || navigator.language);
}

const localeLoaders: Record<
  SupportedLocale,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  uk: () => import("./locales/uk.json"),
  ru: () => import("./locales/ru.json"),
  en: () => import("./locales/en.json"),
  de: () => import("./locales/de.json"),
  fr: () => import("./locales/fr.json"),
  es: () => import("./locales/es.json"),
  it: () => import("./locales/it.json"),
  ja: () => import("./locales/ja.json"),
  "zh-CN": () => import("./locales/zh-CN.json"),
  "nl-NL": () => import("./locales/nl-NL.json"),
  "sq-AL": () => import("./locales/sq-AL.json"),
  pl: () => import("./locales/pl.json"),
  cs: () => import("./locales/cs.json"),
  az: () => import("./locales/az.json"),
};
const loadedLocales = new Set<SupportedLocale>();

export const i18n = createI18n<typeof ukMessages, SupportedLocale, false>({
  legacy: false,
  locale: "uk",
  fallbackLocale: "uk",
  messages: {} as Record<SupportedLocale, typeof ukMessages>,
});

export async function loadLocale(locale: SupportedLocale) {
  if (loadedLocales.has(locale)) return;
  const messages = await localeLoaders[locale]();
  const partialLocales = ["pl", "cs", "az"];
  i18n.global.setLocaleMessage(
    locale,
    partialLocales.includes(locale)
      ? mergeMessages(enMessages, messages.default)
      : messages.default,
  );
  loadedLocales.add(locale);
}

function mergeMessages(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Array.from(new Set([...Object.keys(base), ...Object.keys(override)])).map(
      (key) => {
        const baseValue = base[key];
        const overrideValue = override[key];
        if (
          baseValue &&
          overrideValue &&
          typeof baseValue === "object" &&
          typeof overrideValue === "object" &&
          !Array.isArray(baseValue) &&
          !Array.isArray(overrideValue)
        )
          return [
            key,
            mergeMessages(
              baseValue as Record<string, unknown>,
              overrideValue as Record<string, unknown>,
            ),
          ];
        return [key, overrideValue ?? baseValue];
      },
    ),
  );
}

export async function setLocale(locale: SupportedLocale) {
  await loadLocale(locale);
  i18n.global.locale.value = locale;
  if (typeof window !== "undefined")
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export function initializeLocale() {
  return setLocale(initialLocale());
}
