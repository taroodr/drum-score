import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTutorialBySlug, tutorialArticles } from "@/lib/content";
import { supportedLocales, localePath } from "@/lib/locales";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return tutorialArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getTutorialBySlug(slug);
  if (!article) return {};

  return {
    title: article.en.title,
    description: article.en.description,
    alternates: {
      canonical: `/blog/${slug}`,
      languages: Object.fromEntries(
        supportedLocales.map((code) => [
          code,
          localePath(code, `/blog/${slug}`),
        ])
      ),
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getTutorialBySlug(slug);
  if (!article) {
    notFound();
  }

  return (
    <main className="legal-page content-page">
      <h1>{article.en.title}</h1>
      <p className="legal-updated">Updated: {article.updatedAt}</p>
      <p className="legal-intro">{article.en.intro}</p>
      <section className="legal-section">
        <h2>Practice Steps</h2>
        <ul>
          {article.en.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
