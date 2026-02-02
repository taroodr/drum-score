import type { MetadataRoute } from "next";
import { supportedLocales } from "@/lib/locales";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://drum-score.pages.dev";
  const entries: MetadataRoute.Sitemap = [];

  supportedLocales.forEach((lang) => {
    entries.push({
      url: `${base}/${lang}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    });
    entries.push({
      url: `${base}/${lang}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    });
    entries.push({
      url: `${base}/${lang}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    });
  });

  return entries;
}
