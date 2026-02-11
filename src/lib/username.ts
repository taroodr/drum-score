import { routeLocales, supportedLocales } from "@/lib/locales";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const RESERVED_SEGMENTS = new Set(
  [
    "api",
    "blog",
    "community",
    "contact",
    "faq",
    "my",
    "privacy",
    "terms",
    "login",
    "signup",
    "settings",
    "about",
    "ads.txt",
    "favicon.ico",
    "icon.svg",
    "robots.txt",
    "sitemap.xml",
    "_next",
    "u",
  ]
    .concat(routeLocales)
    .concat(supportedLocales)
);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidUsernameFormat(input: string): boolean {
  return USERNAME_PATTERN.test(input);
}

export function isReservedUsername(input: string): boolean {
  return RESERVED_SEGMENTS.has(input);
}

export function isPublicUsername(input: string): boolean {
  return isValidUsernameFormat(input) && !isReservedUsername(input);
}

export function suggestUsername(input: string): string {
  const base = normalizeUsername(input)
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+/, "")
    .slice(0, 20);

  if (base.length >= 3 && isPublicUsername(base)) {
    return base;
  }

  const padded = `${base || "user"}_123`.slice(0, 20);
  if (padded.length >= 3 && isPublicUsername(padded)) {
    return padded;
  }

  return "user_123";
}
