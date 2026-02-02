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
