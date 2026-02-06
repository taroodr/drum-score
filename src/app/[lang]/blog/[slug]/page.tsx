import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTutorialBySlug, tutorialArticles } from "@/lib/content";
import { supportedLocales } from "@/lib/locales";

type PageProps = {
  params: Promise<{ lang: string; slug: string }>;
};

export function generateStaticParams() {
  return supportedLocales.flatMap((lang) =>
    tutorialArticles.map((article) => ({ lang, slug: article.slug }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const article = getTutorialBySlug(resolved.slug);
  if (!article) return {};
  const lang = resolved.lang === "ja" ? "ja" : "en";
  const copy = lang === "ja" ? article.ja : article.en;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `/${resolved.lang}/blog/${resolved.slug}`,
      languages: Object.fromEntries(
        supportedLocales.map((code) => [code, `/${code}/blog/${resolved.slug}`])
      ),
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const resolved = await params;
  const article = getTutorialBySlug(resolved.slug);
  if (!article) {
    notFound();
  }
  const lang = resolved.lang === "ja" ? "ja" : "en";
  const copy = lang === "ja" ? article.ja : article.en;

  return (
    <main className="legal-page content-page">
      <h1>{copy.title}</h1>
      <p className="legal-updated">Updated: {article.updatedAt}</p>
      <p className="legal-intro">{copy.intro}</p>
      <section className="legal-section">
        <h2>{lang === "ja" ? "練習ステップ" : "Practice Steps"}</h2>
        <ul>
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
