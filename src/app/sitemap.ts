import type { MetadataRoute } from "next";
import { sampleScores, tutorialArticles } from "@/lib/content";
import { supportedLocales, localePath } from "@/lib/locales";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://drum-score.pages.dev";
  const entries: MetadataRoute.Sitemap = [];

  supportedLocales.forEach((lang) => {
    const prefix = localePath(lang);
    entries.push({
      url: `${base}${prefix}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    });
    entries.push({
      url: `${base}${localePath(lang, "/faq")}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    });
    entries.push({
      url: `${base}${localePath(lang, "/blog")}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
    entries.push({
      url: `${base}${localePath(lang, "/scores")}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
    entries.push({
      url: `${base}${localePath(lang, "/privacy")}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    });
    entries.push({
      url: `${base}${localePath(lang, "/contact")}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    });

    tutorialArticles.forEach((article) => {
      entries.push({
        url: `${base}${localePath(lang, `/blog/${article.slug}`)}`,
        lastModified: new Date(article.updatedAt),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    });

    sampleScores.forEach((score) => {
      entries.push({
        url: `${base}${localePath(lang, `/scores/${score.slug}`)}`,
        lastModified: new Date(score.updatedAt),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    });
  });

  return entries;
}
