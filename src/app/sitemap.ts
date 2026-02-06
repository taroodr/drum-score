import type { MetadataRoute } from "next";
import { sampleScores, tutorialArticles } from "@/lib/content";
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
      url: `${base}/${lang}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    });
    entries.push({
      url: `${base}/${lang}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
    entries.push({
      url: `${base}/${lang}/scores`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
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

    tutorialArticles.forEach((article) => {
      entries.push({
        url: `${base}/${lang}/blog/${article.slug}`,
        lastModified: new Date(article.updatedAt),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    });

    sampleScores.forEach((score) => {
      entries.push({
        url: `${base}/${lang}/scores/${score.slug}`,
        lastModified: new Date(score.updatedAt),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    });
  });

  return entries;
}
