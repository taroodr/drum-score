import type { Metadata } from "next";
import Link from "next/link";
import { supportedLocales, localePath } from "@/lib/locales";
import { tutorialArticles } from "@/lib/content";

export const metadata: Metadata = {
  title: "Drum Blog and Tutorials",
  description:
    "Tutorial articles for drum notation reading, 8 beat practice, and groove building.",
  alternates: {
    canonical: "/blog",
    languages: Object.fromEntries(
      supportedLocales.map((code) => [code, localePath(code, "/blog")])
    ),
  },
};

export default function BlogIndexPage() {
  return (
    <main className="legal-page content-page">
      <h1>Blog and Tutorials</h1>
      <p className="legal-intro">
        Updated tutorial articles for drum notation reading and 8 beat groove
        practice.
      </p>
      <div className="content-grid">
        {tutorialArticles.map((article) => (
          <article key={article.slug} className="content-card">
            <h2>
              <Link href={`/blog/${article.slug}`}>{article.en.title}</Link>
            </h2>
            <p>{article.en.description}</p>
            <p className="legal-updated">Updated: {article.updatedAt}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
