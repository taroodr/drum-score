import type { Metadata } from "next";
import Link from "next/link";
import { sampleScores } from "@/lib/content";
import { supportedLocales, routeLocales, localePath } from "@/lib/locales";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return routeLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const lang = resolved.lang === "ja" ? "ja" : "en";

  return {
    title: lang === "ja" ? "人気曲サンプルドラム譜" : "Popular Song Sample Drum Scores",
    description:
      lang === "ja"
        ? "人気曲検索向けのサンプルドラム譜ページ一覧。曲ごとのグルーヴ構成と練習ポイントを掲載。"
        : "Sample drum score pages for popular songs, with groove patterns and practice tips.",
    alternates: {
      canonical: localePath(resolved.lang, "/scores"),
      languages: Object.fromEntries(supportedLocales.map((code) => [code, localePath(code, "/scores")])),
    },
  };
}

export default async function ScoresIndexPage({ params }: PageProps) {
  const resolved = await params;
  const lang = resolved.lang === "ja" ? "ja" : "en";

  return (
    <main className="legal-page content-page">
      <h1>{lang === "ja" ? "人気曲サンプル譜面" : "Popular Song Sample Scores"}</h1>
      <p className="legal-intro">
        {lang === "ja"
          ? "曲名検索に対応したサンプル譜面ページです。実際の演奏に使える練習ポイントをまとめています。"
          : "Sample score pages aligned with song-name search intent, including practical groove tips."}
      </p>
      <div className="content-grid">
        {sampleScores.map((score) => {
          const copy = lang === "ja" ? score.ja : score.en;
          return (
            <article key={score.slug} className="content-card">
              <h2>
                <Link href={`/${resolved.lang}/scores/${score.slug}`}>{copy.title}</Link>
              </h2>
              <p>{copy.description}</p>
              <p className="legal-updated">{score.style} | {score.bpm} BPM</p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
