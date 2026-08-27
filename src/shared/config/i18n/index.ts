import { createI18n } from "vue-i18n";

export const supportedLocales = ["uk", "en", "de", "fr", "es", "it", "ja", "zh-CN"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const localeLabels: Record<SupportedLocale, string> = {
  uk: "Українська", en: "English", de: "Deutsch", fr: "Français",
  es: "Español", it: "Italiano", ja: "日本語", "zh-CN": "简体中文",
};
export const localeShortLabels: Record<SupportedLocale, string> = {
  uk: "UA", en: "EN", de: "DE", fr: "FR", es: "ES", it: "IT", ja: "JA", "zh-CN": "中文",
};
const LOCALE_STORAGE_KEY = "f1-calendar-locale";
export function normalizeLocale(value?: string | null): SupportedLocale {
  const candidate = value?.replace("_", "-");
  if (candidate === "zh-CN" || candidate?.toLowerCase().startsWith("zh")) return "zh-CN";
  const language = candidate?.split("-")[0]?.toLowerCase();
  return supportedLocales.includes(language as SupportedLocale) ? language as SupportedLocale : "en";
}
export function initialLocale(): SupportedLocale {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved) return normalizeLocale(saved);
  return normalizeLocale(navigator.languages?.[0] || navigator.language);
}

const localeLoaders: Record<SupportedLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  uk: () => import("./locales/uk.json"),
  en: () => import("./locales/en.json"),
  de: () => import("./locales/de.json"),
  fr: () => import("./locales/fr.json"),
  es: () => import("./locales/es.json"),
  it: () => import("./locales/it.json"),
  ja: () => import("./locales/ja.json"),
  "zh-CN": () => import("./locales/zh-CN.json"),
};
const loadedLocales = new Set<SupportedLocale>();

export const i18n = createI18n({
  legacy: false,
  locale: "uk",
  fallbackLocale: "uk",
  messages: {},
});

export async function loadLocale(locale: SupportedLocale) {
  if (loadedLocales.has(locale)) return;
  const messages = await localeLoaders[locale]();
  i18n.global.setLocaleMessage(locale, messages.default);
  loadedLocales.add(locale);
}

export async function setLocale(locale: SupportedLocale) {
  await loadLocale(locale);
  i18n.global.locale.value = locale;
  if (typeof window !== "undefined") window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export function initializeLocale() {
  return setLocale(initialLocale());
}
