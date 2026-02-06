import type { Metadata } from "next";
import Link from "next/link";
import { supportedLocales } from "@/lib/locales";
import { tutorialArticles } from "@/lib/content";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return supportedLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const lang = resolved.lang === "ja" ? "ja" : "en";

  return {
    title: lang === "ja" ? "ドラムブログ・チュートリアル" : "Drum Blog and Tutorials",
    description:
      lang === "ja"
        ? "ドラム譜の読み方や8ビート練習法など、検索ニーズに合わせたチュートリアル記事一覧。"
        : "Tutorial articles for drum notation reading, 8 beat practice, and groove building.",
    alternates: {
      canonical: `/${resolved.lang}/blog`,
      languages: Object.fromEntries(supportedLocales.map((code) => [code, `/${code}/blog`])),
    },
  };
}

export default async function BlogIndexPage({ params }: PageProps) {
  const resolved = await params;
  const lang = resolved.lang === "ja" ? "ja" : "en";

  return (
    <main className="legal-page content-page">
      <h1>{lang === "ja" ? "ブログ・チュートリアル" : "Blog and Tutorials"}</h1>
      <p className="legal-intro">
        {lang === "ja"
          ? "ドラム譜の読み方、8ビート練習など、実践に直結する記事を更新しています。"
          : "Updated tutorial articles for drum notation reading and 8 beat groove practice."}
      </p>
      <div className="content-grid">
        {tutorialArticles.map((article) => {
          const copy = lang === "ja" ? article.ja : article.en;
          return (
            <article key={article.slug} className="content-card">
              <h2>
                <Link href={`/${resolved.lang}/blog/${article.slug}`}>{copy.title}</Link>
              </h2>
              <p>{copy.description}</p>
              <p className="legal-updated">Updated: {article.updatedAt}</p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
