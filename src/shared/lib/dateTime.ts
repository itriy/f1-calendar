const albanianDateParts: Record<string, string> = {
  January: "janar",
  February: "shkurt",
  March: "mars",
  April: "prill",
  May: "maj",
  June: "qershor",
  July: "korrik",
  August: "gusht",
  September: "shtator",
  October: "tetor",
  November: "nëntor",
  December: "dhjetor",
  Jan: "jan",
  Feb: "shk",
  Mar: "mar",
  Apr: "pri",
  Jun: "qer",
  Jul: "kor",
  Aug: "gush",
  Sep: "sht",
  Oct: "tet",
  Nov: "nën",
  Dec: "dhj",
  Sunday: "e diel",
  Monday: "e hënë",
  Tuesday: "e martë",
  Wednesday: "e mërkurë",
  Thursday: "e enjte",
  Friday: "e premte",
  Saturday: "e shtunë",
  Sun: "die",
  Mon: "hën",
  Tue: "mar",
  Wed: "mër",
  Thu: "enj",
  Fri: "pre",
  Sat: "sht",
};

function albanianFallback(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): string {
  const formatted = new Intl.DateTimeFormat("en-GB", options)
    .formatToParts(date)
    .map((part) => {
      if (part.type === "month" || part.type === "weekday")
        return albanianDateParts[part.value] || part.value;
      if (part.type === "literal") return part.value.replace(" at ", " në ");
      return part.value;
    })
    .join("");
  if (!options.weekday) return formatted;
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: options.weekday,
    timeZone: options.timeZone,
  }).format(date);
  const translatedWeekday = albanianDateParts[weekday] || weekday;
  if (formatted.startsWith(`${translatedWeekday},`)) return formatted;
  return formatted.startsWith(`${translatedWeekday} `)
    ? `${translatedWeekday}, ${formatted.slice(translatedWeekday.length + 1)}`
    : formatted;
}

export function formatDateTime(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  if (
    locale === "sq-AL" &&
    Intl.DateTimeFormat.supportedLocalesOf(locale).length === 0
  )
    return albanianFallback(date, options);
  return new Intl.DateTimeFormat(locale, options).format(date);
}
