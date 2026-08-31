import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  canonicalUrl,
  localePath,
  seoLocales,
  seoPages,
} from "../src/shared/config/seo";

const outputDirectory = resolve("dist");
const template = await readFile(resolve(outputDirectory, "index.html"), "utf8");

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character]!;
  });
}

function pageHead(locale: (typeof seoLocales)[number]): string {
  const page = seoPages[locale];
  const canonical = canonicalUrl(locale);
  const alternates = seoLocales
    .map(
      (alternateLocale) =>
        `<link rel="alternate" hreflang="${alternateLocale}" href="${canonicalUrl(alternateLocale)}" />`,
    )
    .join("\n    ");
  return `<meta name="description" content="${escapeHtml(page.description)}" />
    <link rel="canonical" href="${canonical}" />
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${canonicalUrl("uk")}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="F1 Calendar" />
    <meta property="og:title" content="${escapeHtml(page.title)}" />
    <meta property="og:description" content="${escapeHtml(page.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(page.title)}" />
    <meta name="twitter:description" content="${escapeHtml(page.description)}" />
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"F1 Calendar","url":"${canonical}","inLanguage":"${locale}"}</script>`;
}

function criticalFontPreloads(
  locale: (typeof seoLocales)[number],
): string {
  const fonts = [
    "/fonts/barlow-condensed-800-latin.woff2",
    "/fonts/manrope-latin.woff2",
  ];
  if (["de", "fr", "es", "it"].includes(locale)) {
    fonts.push(
      "/fonts/barlow-condensed-800-latin-ext.woff2",
      "/fonts/manrope-latin-ext.woff2",
    );
  }
  if (["uk", "ru"].includes(locale))
    fonts.push("/fonts/manrope-cyrillic.woff2");
  return fonts
    .map(
      (font) =>
        `<link rel="preload" href="${font}" as="font" type="font/woff2" crossorigin />`,
    )
    .join("\n    ");
}

function fallbackContent(locale: (typeof seoLocales)[number]): string {
  const page = seoPages[locale];
  return `<main data-seo-fallback="true"><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.intro)}</p><p>F1 Calendar</p></main>`;
}

for (const locale of seoLocales) {
  const page = seoPages[locale];
  const html = template
    .replace('<html lang="uk">', `<html lang="${locale}">`)
    .replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeHtml(page.title)}</title>\n    ${criticalFontPreloads(locale)}`,
    )
    .replace("</head>", `    ${pageHead(locale)}\n  </head>`)
    .replace(
      '<div id="app"></div>',
      `<div id="app">${fallbackContent(locale)}</div>`,
    );
  const destination = resolve(
    outputDirectory,
    `.${localePath(locale)}`,
    "index.html",
  );
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
}

await writeFile(
  resolve(outputDirectory, "404.html"),
  template.replace(
    "</head>",
    '    <meta name="robots" content="noindex, nofollow" />\n  </head>',
  ),
);
