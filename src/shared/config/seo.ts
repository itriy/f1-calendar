import type { SupportedLocale } from "./i18n";

export const SITE_ORIGIN = "https://f1-calendar.date";

export type SeoPage = {
  title: string;
  description: string;
  heading: string;
  intro: string;
};

export const seoPages: Record<SupportedLocale, SeoPage> = {
  uk: {
    title:
      "Календар Формули 1 2026 - розклад гонок, результати й таблиці | F1 Calendar",
    description:
      "Актуальний календар Формули 1 2026: розклад гонок, результати, турнірні таблиці, новини та нагадування українською.",
    heading: "Календар Формули 1 2026",
    intro:
      "Розклад гонок, результати та лідери чемпіонату Формули 1 в одному місці.",
  },
  ru: {
    title:
      "Календарь Формулы-1 2026 - расписание гонок, результаты и таблицы | F1 Calendar",
    description:
      "Актуальный календарь Формулы-1 2026: расписание гонок, результаты, турнирные таблицы, новости и напоминания на русском языке.",
    heading: "Календарь Формулы-1 2026",
    intro:
      "Расписание гонок, результаты и лидеры чемпионата Формулы-1 в одном месте.",
  },
  en: {
    title:
      "Formula 1 Calendar 2026 - race schedule, results and standings | F1 Calendar",
    description:
      "The up-to-date 2026 Formula 1 calendar: race schedule, results, standings, news and reminders.",
    heading: "Formula 1 Calendar 2026",
    intro:
      "Formula 1 race schedules, results and championship leaders in one place.",
  },
  de: {
    title:
      "Formel-1-Kalender 2026 - Rennkalender, Ergebnisse und Tabellen | F1 Calendar",
    description:
      "Der aktuelle Formel-1-Kalender 2026: Renntermine, Ergebnisse, Tabellen, Nachrichten und Erinnerungen.",
    heading: "Formel-1-Kalender 2026",
    intro: "Formel-1-Renntermine, Ergebnisse und WM-Tabellen an einem Ort.",
  },
  fr: {
    title:
      "Calendrier Formule 1 2026 - courses, résultats et classements | F1 Calendar",
    description:
      "Le calendrier Formule 1 2026 à jour : horaires des courses, résultats, classements, actualités et rappels.",
    heading: "Calendrier Formule 1 2026",
    intro:
      "Les courses, résultats et leaders du championnat de Formule 1 au même endroit.",
  },
  es: {
    title:
      "Calendario Fórmula 1 2026 - carreras, resultados y clasificaciones | F1 Calendar",
    description:
      "El calendario actualizado de Fórmula 1 2026: horarios, resultados, clasificaciones, noticias y recordatorios.",
    heading: "Calendario Fórmula 1 2026",
    intro:
      "Carreras, resultados y líderes del campeonato de Fórmula 1 en un solo lugar.",
  },
  it: {
    title:
      "Calendario Formula 1 2026 - gare, risultati e classifiche | F1 Calendar",
    description:
      "Il calendario aggiornato della Formula 1 2026: orari delle gare, risultati, classifiche, notizie e promemoria.",
    heading: "Calendario Formula 1 2026",
    intro:
      "Gare, risultati e leader del campionato di Formula 1 in un unico posto.",
  },
  ja: {
    title: "F1カレンダー2026 - レース日程・結果・ランキング | F1 Calendar",
    description:
      "2026年F1の最新カレンダー。レース日程、結果、ランキング、ニュース、リマインダーを掲載。",
    heading: "F1カレンダー2026",
    intro:
      "F1のレース日程、結果、チャンピオンシップ順位を一か所で確認できます。",
  },
  "zh-CN": {
    title: "2026 年 F1 赛历 - 比赛日程、成绩和积分榜 | F1 Calendar",
    description: "最新 2026 年 F1 赛历：比赛时间、成绩、积分榜、新闻和提醒。",
    heading: "2026 年 F1 赛历",
    intro: "在一个地方查看 F1 比赛日程、成绩和锦标赛排名。",
  },
  "nl-NL": {
    title:
      "Formule 1-kalender 2026 - races, uitslagen en standen | F1 Calendar",
    description:
      "De actuele Formule 1-kalender van 2026 met racetijden, uitslagen, standen, nieuws en herinneringen.",
    heading: "Formule 1-kalender 2026",
    intro: "Formule 1-races, uitslagen en kampioenschapsstanden op één plek.",
  },
  "sq-AL": {
    title:
      "Kalendari i Formula 1 2026 - garat, rezultatet dhe renditja | F1 Calendar",
    description:
      "Kalendari i përditësuar i Formula 1 për vitin 2026 me oraret e garave, rezultatet, renditjen, lajmet dhe kujtesat.",
    heading: "Kalendari i Formula 1 2026",
    intro:
      "Garat, rezultatet dhe renditja e kampionatit të Formula 1 në një vend.",
  },
};

export const seoLocales = Object.keys(seoPages) as SupportedLocale[];

export function localePath(locale: SupportedLocale): string {
  return `/${locale}/`;
}

export function canonicalUrl(locale: SupportedLocale): string {
  return `${SITE_ORIGIN}${localePath(locale)}`;
}

export function localeFromPathname(pathname: string): SupportedLocale | null {
  const locale = pathname.split("/").filter(Boolean)[0];
  return seoLocales.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : null;
}
