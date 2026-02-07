export const supportedLocales = [
  "nl",
  "id",
  "de",
  "en",
  "es",
  "fr",
  "it",
  "pl",
  "pt",
  "vi",
  "tr",
  "ru",
  "ar",
  "th",
  "ja",
  "zh",
  "ko",
] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

/** Locales that use a /[lang] URL prefix (everything except "en"). */
export const routeLocales = supportedLocales.filter(
  (l): l is Exclude<SupportedLocale, "en"> => l !== "en"
);

/** Return the URL path for a given locale. English maps to root. */
export function localePath(locale: string, path = ""): string {
  return locale === "en" ? path || "/" : `/${locale}${path}`;
}
