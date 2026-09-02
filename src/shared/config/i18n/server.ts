import { normalizeLocale, type SupportedLocale } from "./index";

const uk = {
  methodNotAllowed: "Метод не підтримується.",
  videoRateLimited: "Забагато запитів до відео. Спробуйте пізніше.",
  videoNotConfigured: "Відео Formula 1 ще не налаштовані власником сайту.",
  videoUnavailable: "Відео Formula 1 тимчасово недоступні. Спробуйте пізніше.",
  invalidRaceData: "Некоректні дані етапу.",
  rateLimited: "Забагато запитів. Спробуйте знову за кілька хвилин.",
  payloadTooLarge: "Запит завеликий.",
  invalidRequest: "Некоректний запит.",
  invalidQuery: "Запит має містити від 3 до {max} символів.",
  searchNotConfigured: "AI-пошук ще не налаштований.",
  aiPrompt:
    "Ти - пошук для F1 Calendar. Відповідай українською, стисло й лише на теми Формули 1, F2, F3, WEC, команд, пілотів, трас, перегонів та автоспорту. Якщо запит не про автоспорт, поясни, що пошук підтримує лише F1 та суміжний автоспорт. Не вигадуй фактів; спирайся на результати веб-пошуку. Запит користувача: {query}",
  providerRateLimited: "Вичерпано ліміт AI-пошуку. Спробуйте пізніше.",
  providerAuthFailed:
    "Налаштування AI-пошуку відхилено. Зверніться до власника сайту.",
  providerModelUnavailable:
    "Налаштована AI-модель недоступна. Зверніться до власника сайту.",
  providerUnavailable: "AI-пошук тимчасово недоступний. Спробуйте пізніше.",
  emptySearchResponse:
    "AI-пошук не повернув відповіді. Спробуйте змінити запит.",
  providerError: "Сталася помилка під час AI-пошуку. Спробуйте ще раз.",
  apiNotFound: "Маршрут API не знайдено.",
  remindersNotConfigured: "Нагадування ще не налаштовані власником сайту.",
  invalidSubscription: "Некоректна push-підписка.",
  invalidPreferences: "Оберіть хоча б формат налаштувань нагадування.",
  subscriptionNotFound: "Підписку не знайдено.",
  reminderDay: "за 1 день",
  reminderHour: "за 1 годину",
  reminderNow: "зараз",
  raceStarted: "Гонка стартує",
  raceReminder: "Нагадування про гонку",
  f1Round: "Етап Формули 1",
  scheduledStartNow: "запланований старт зараз",
  scheduledStart: "запланований старт {timing}",
  newsSummaryPrompt:
    "Стисло, одним реченням українською перекажи заголовок новини Формули 1. Не додавай фактів: {title}",
} as const;

const serverTranslations: Partial<
  Record<
    Exclude<SupportedLocale, "uk">,
    Partial<Record<keyof typeof uk, string>>
  >
> = {
  ru: {
    methodNotAllowed: "Метод не поддерживается.",
    videoRateLimited: "Слишком много запросов к видео. Попробуйте позже.",
    videoNotConfigured: "Видео Formula 1 ещё не настроены владельцем сайта.",
    videoUnavailable: "Видео Formula 1 временно недоступны. Попробуйте позже.",
    invalidRaceData: "Некорректные данные этапа.",
    rateLimited:
      "Слишком много запросов. Попробуйте снова через несколько минут.",
    payloadTooLarge: "Запрос слишком большой.",
    invalidRequest: "Некорректный запрос.",
    invalidQuery: "Запрос должен содержать от 3 до {max} символов.",
    searchNotConfigured: "AI-поиск ещё не настроен.",
    aiPrompt:
      "Ты - поиск для F1 Calendar. Отвечай по-русски, кратко и только на темы Формулы-1, F2, F3, WEC, команд, пилотов, трасс, гонок и автоспорта. Если запрос не об автоспорте, объясни, что поиск поддерживает только F1 и смежный автоспорт. Не выдумывай факты; опирайся на результаты веб-поиска. Запрос пользователя: {query}",
    providerRateLimited: "Лимит AI-поиска исчерпан. Попробуйте позже.",
    providerAuthFailed:
      "Настройки AI-поиска отклонены. Обратитесь к владельцу сайта.",
    providerModelUnavailable:
      "Настроенная AI-модель недоступна. Обратитесь к владельцу сайта.",
    providerUnavailable: "AI-поиск временно недоступен. Попробуйте позже.",
    emptySearchResponse:
      "AI-поиск не вернул ответ. Попробуйте изменить запрос.",
    providerError: "Произошла ошибка AI-поиска. Попробуйте ещё раз.",
    apiNotFound: "Маршрут API не найден.",
    remindersNotConfigured: "Напоминания ещё не настроены владельцем сайта.",
    invalidSubscription: "Некорректная push-подписка.",
    invalidPreferences: "Выберите хотя бы один вариант напоминания.",
    subscriptionNotFound: "Подписка не найдена.",
    reminderDay: "за 1 день",
    reminderHour: "за 1 час",
    reminderNow: "сейчас",
    raceStarted: "Гонка стартует",
    raceReminder: "Напоминание о гонке",
    f1Round: "Этап Формулы-1",
    scheduledStartNow: "запланированный старт сейчас",
    scheduledStart: "запланированный старт {timing}",
    newsSummaryPrompt:
      "Кратко, одним предложением на русском языке перескажи заголовок новости Формулы-1. Не добавляй фактов: {title}",
  },
  en: {
    methodNotAllowed: "Method is not allowed.",
    rateLimited: "Too many requests. Please try again in a few minutes.",
    invalidRequest: "Invalid request.",
    invalidQuery: "The query must contain 3 to {max} characters.",
    searchNotConfigured: "AI search has not been configured yet.",
    providerError: "An error occurred during AI search. Please try again.",
    raceStarted: "Race starts",
    raceReminder: "Race reminder",
    reminderDay: "in 1 day",
    reminderHour: "in 1 hour",
    reminderNow: "now",
    f1Round: "Formula 1 round",
    scheduledStartNow: "scheduled start now",
    scheduledStart: "scheduled start {timing}",
    aiPrompt:
      "You are the search assistant for F1 Calendar. Answer briefly in English and only about Formula 1, F2, F3, WEC, teams, drivers, circuits, races, and motorsport. Do not invent facts; rely on web search results. User query: {query}",
    newsSummaryPrompt:
      "Summarize this Formula 1 news headline in one short English sentence. Do not add facts: {title}",
  },
  de: {
    methodNotAllowed: "Methode nicht erlaubt.",
    rateLimited: "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
    raceStarted: "Rennstart",
    raceReminder: "Rennerinnerung",
    reminderDay: "in 1 Tag",
    reminderHour: "in 1 Stunde",
    reminderNow: "jetzt",
    newsSummaryPrompt:
      "Fasse diese Formel-1-Schlagzeile in einem kurzen deutschen Satz zusammen. Füge keine Fakten hinzu: {title}",
  },
  fr: {
    methodNotAllowed: "Méthode non autorisée.",
    rateLimited: "Trop de requêtes. Réessayez plus tard.",
    raceStarted: "Départ de la course",
    raceReminder: "Rappel de course",
    reminderDay: "dans 1 jour",
    reminderHour: "dans 1 heure",
    reminderNow: "maintenant",
    newsSummaryPrompt:
      "Résume ce titre de Formule 1 en une courte phrase française sans ajouter de faits : {title}",
  },
  es: {
    methodNotAllowed: "Método no permitido.",
    rateLimited: "Demasiadas solicitudes. Inténtalo más tarde.",
    raceStarted: "Comienza la carrera",
    raceReminder: "Recordatorio de carrera",
    reminderDay: "en 1 día",
    reminderHour: "en 1 hora",
    reminderNow: "ahora",
    newsSummaryPrompt:
      "Resume este titular de Fórmula 1 en una frase breve en español sin añadir hechos: {title}",
  },
  it: {
    methodNotAllowed: "Metodo non consentito.",
    rateLimited: "Troppe richieste. Riprova più tardi.",
    raceStarted: "Inizio gara",
    raceReminder: "Promemoria gara",
    reminderDay: "tra 1 giorno",
    reminderHour: "tra 1 ora",
    reminderNow: "ora",
    newsSummaryPrompt:
      "Riassumi questo titolo di Formula 1 in una breve frase italiana senza aggiungere fatti: {title}",
  },
  ja: {
    methodNotAllowed: "このメソッドは使用できません。",
    rateLimited: "リクエストが多すぎます。後でもう一度お試しください。",
    raceStarted: "レース開始",
    raceReminder: "レースリマインダー",
    reminderDay: "1日前",
    reminderHour: "1時間前",
    reminderNow: "今",
    newsSummaryPrompt:
      "このF1ニュースの見出しを、事実を加えず日本語で一文に要約してください: {title}",
  },
  "zh-CN": {
    methodNotAllowed: "不支持此方法。",
    rateLimited: "请求过多，请稍后再试。",
    raceStarted: "比赛开始",
    raceReminder: "比赛提醒",
    reminderDay: "1天后",
    reminderHour: "1小时后",
    reminderNow: "现在",
    newsSummaryPrompt:
      "请将这条F1新闻标题用简体中文概括为一句话，不要添加事实：{title}",
  },
  "nl-NL": {
    methodNotAllowed: "Deze methode is niet toegestaan.",
    videoRateLimited: "Te veel videoverzoeken. Probeer het later opnieuw.",
    videoNotConfigured:
      "Formule 1-video's zijn nog niet ingesteld door de sitebeheerder.",
    videoUnavailable:
      "Formule 1-video's zijn tijdelijk niet beschikbaar. Probeer het later opnieuw.",
    invalidRaceData: "Ongeldige racegegevens.",
    rateLimited:
      "Te veel verzoeken. Probeer het over een paar minuten opnieuw.",
    payloadTooLarge: "Het verzoek is te groot.",
    invalidRequest: "Ongeldig verzoek.",
    invalidQuery: "De zoekopdracht moet 3 tot {max} tekens bevatten.",
    searchNotConfigured: "AI-zoeken is nog niet ingesteld.",
    aiPrompt:
      "Je bent de zoekassistent van F1 Calendar. Antwoord kort in het Nederlands en uitsluitend over Formule 1, F2, F3, WEC, teams, coureurs, circuits, races en autosport. Leg bij andere onderwerpen uit dat de zoekfunctie alleen F1 en aanverwante autosport ondersteunt. Verzin geen feiten; baseer je op de resultaten van de webzoekopdracht. Zoekopdracht van de gebruiker: {query}",
    providerRateLimited:
      "De limiet voor AI-zoeken is bereikt. Probeer het later opnieuw.",
    providerAuthFailed:
      "De instellingen voor AI-zoeken zijn geweigerd. Neem contact op met de sitebeheerder.",
    providerModelUnavailable:
      "Het ingestelde AI-model is niet beschikbaar. Neem contact op met de sitebeheerder.",
    providerUnavailable:
      "AI-zoeken is tijdelijk niet beschikbaar. Probeer het later opnieuw.",
    emptySearchResponse:
      "AI-zoeken heeft geen antwoord opgeleverd. Probeer een andere zoekopdracht.",
    providerError:
      "Er is een fout opgetreden tijdens AI-zoeken. Probeer het opnieuw.",
    apiNotFound: "API-route niet gevonden.",
    remindersNotConfigured:
      "Herinneringen zijn nog niet ingesteld door de sitebeheerder.",
    invalidSubscription: "Ongeldig pushabonnement.",
    invalidPreferences: "Kies ten minste één herinneringsmoment.",
    subscriptionNotFound: "Abonnement niet gevonden.",
    reminderDay: "over 1 dag",
    reminderHour: "over 1 uur",
    reminderNow: "nu",
    raceStarted: "Race begint",
    raceReminder: "Raceherinnering",
    f1Round: "Formule 1-ronde",
    scheduledStartNow: "geplande start nu",
    scheduledStart: "geplande start {timing}",
    newsSummaryPrompt:
      "Vat deze Formule 1-nieuwskop samen in één korte Nederlandse zin. Voeg geen feiten toe: {title}",
  },
  "sq-AL": {
    methodNotAllowed: "Kjo metodë nuk lejohet.",
    videoRateLimited: "Shumë kërkesa për video. Provo përsëri më vonë.",
    videoNotConfigured:
      "Videot e Formula 1 nuk janë konfiguruar ende nga administratori i faqes.",
    videoUnavailable:
      "Videot e Formula 1 nuk janë përkohësisht të disponueshme. Provo përsëri më vonë.",
    invalidRaceData: "Të dhënat e garës janë të pavlefshme.",
    rateLimited: "Shumë kërkesa. Provo përsëri pas disa minutash.",
    payloadTooLarge: "Kërkesa është shumë e madhe.",
    invalidRequest: "Kërkesë e pavlefshme.",
    invalidQuery: "Kërkimi duhet të përmbajë nga 3 deri në {max} shenja.",
    searchNotConfigured: "Kërkimi me AI nuk është konfiguruar ende.",
    aiPrompt:
      "Je asistenti i kërkimit për F1 Calendar. Përgjigju shkurt në shqip dhe vetëm për Formula 1, F2, F3, WEC, ekipet, pilotët, pistat, garat dhe sportin motorik. Nëse pyetja nuk lidhet me sportin motorik, shpjego se kërkimi mbështet vetëm F1 dhe sportet motorike të ngjashme. Mos shpik fakte; mbështetu te rezultatet e kërkimit në internet. Pyetja e përdoruesit: {query}",
    providerRateLimited:
      "Kufiri i kërkimit me AI është arritur. Provo përsëri më vonë.",
    providerAuthFailed:
      "Konfigurimi i kërkimit me AI u refuzua. Kontakto administratorin e faqes.",
    providerModelUnavailable:
      "Modeli i konfiguruar i AI nuk është i disponueshëm. Kontakto administratorin e faqes.",
    providerUnavailable:
      "Kërkimi me AI nuk është përkohësisht i disponueshëm. Provo përsëri më vonë.",
    emptySearchResponse:
      "Kërkimi me AI nuk dha përgjigje. Provo një kërkim tjetër.",
    providerError: "Ndodhi një gabim gjatë kërkimit me AI. Provo përsëri.",
    apiNotFound: "Rruga e API-së nuk u gjet.",
    remindersNotConfigured:
      "Kujtesat nuk janë konfiguruar ende nga administratori i faqes.",
    invalidSubscription: "Abonim push i pavlefshëm.",
    invalidPreferences: "Zgjidh të paktën një kohë kujtese.",
    subscriptionNotFound: "Abonimi nuk u gjet.",
    reminderDay: "pas 1 dite",
    reminderHour: "pas 1 ore",
    reminderNow: "tani",
    raceStarted: "Gara nis",
    raceReminder: "Kujtesë për garën",
    f1Round: "Raundi i Formula 1",
    scheduledStartNow: "nisja e planifikuar tani",
    scheduledStart: "nisja e planifikuar {timing}",
    newsSummaryPrompt:
      "Përmblidhe këtë titull lajmi të Formula 1 në një fjali të shkurtër në shqip. Mos shto fakte: {title}",
  },
};

export function requestLocale(
  request: Request,
  supplied?: unknown,
): SupportedLocale {
  if (typeof supplied === "string") return normalizeLocale(supplied);
  const requested =
    new URL(request.url).searchParams.get("locale") ||
    request.headers.get("Accept-Language");
  return requested ? normalizeLocale(requested) : "uk";
}

export function serverText(
  key: keyof typeof uk,
  values: Record<string, string | number> = {},
  locale: SupportedLocale = "uk",
): string {
  if (
    key === "aiPrompt" &&
    locale !== "uk" &&
    !serverTranslations[locale]?.[key]
  ) {
    const language =
      locale === "zh-CN"
        ? "Simplified Chinese"
        : (
            {
              de: "German",
              fr: "French",
              es: "Spanish",
              it: "Italian",
              ja: "Japanese",
              "nl-NL": "Dutch",
              "sq-AL": "Albanian",
              ru: "Russian",
            } as Record<string, string>
          )[locale] || "English";
    return `You are the search assistant for F1 Calendar. Answer briefly in ${language} and only about Formula 1, F2, F3, WEC, teams, drivers, circuits, races, and motorsport. Do not invent facts; rely on web search results. User query: ${values.query ?? ""}`;
  }
  const template =
    serverTranslations[locale]?.[key] ||
    (locale === "uk" ? uk[key] : serverTranslations.en[key]) ||
    uk[key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(values[name] ?? ""),
  );
}
