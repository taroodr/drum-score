import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { getSampleScoreBySlug, sampleScores } from "@/lib/content";
import CopyScoreToEditorButton from "@/components/CopyScoreToEditorButton";
import VerovioViewer from "@/components/VerovioViewer";
import { supportedLocales } from "@/lib/locales";

type PageProps = {
  params: Promise<{ lang: string; slug: string }>;
};

export function generateStaticParams() {
  return supportedLocales.flatMap((lang) =>
    sampleScores.map((score) => ({ lang, slug: score.slug }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const score = getSampleScoreBySlug(resolved.slug);
  if (!score) return {};
  const lang = resolved.lang === "ja" ? "ja" : "en";
  const copy = lang === "ja" ? score.ja : score.en;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `/${resolved.lang}/scores/${resolved.slug}`,
      languages: Object.fromEntries(
        supportedLocales.map((code) => [code, `/${code}/scores/${resolved.slug}`])
      ),
    },
  };
}

export default async function ScoreDetailPage({ params }: PageProps) {
  const resolved = await params;
  const score = getSampleScoreBySlug(resolved.slug);
  if (!score) {
    notFound();
  }
  const lang = resolved.lang === "ja" ? "ja" : "en";
  const copy = lang === "ja" ? score.ja : score.en;
  let musicXml: string | null = null;

  if (score.musicXmlPath) {
    try {
      musicXml = await readFile(
        join(process.cwd(), "public", score.musicXmlPath.replace(/^\//, "")),
        "utf8"
      );
    } catch (error) {
      console.error(`Failed to load score XML for ${score.slug}`, error);
    }
  }

  return (
    <main className="legal-page content-page">
      <h1>{copy.title}</h1>
      <p className="legal-updated">{score.style} | {score.bpm} BPM | Updated: {score.updatedAt}</p>
      <p className="legal-intro">{copy.description}</p>
      <section className="legal-section">
        <h2>{lang === "ja" ? "基本パターン" : "Core Pattern"}</h2>
        <ul>
          {copy.pattern.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="legal-section">
        <h2>{lang === "ja" ? "練習ポイント" : "Practice Tips"}</h2>
        <ul>
          {copy.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
      {musicXml && (
        <section className="legal-section">
          <h2>{lang === "ja" ? "譜面プレビュー" : "Score Preview"}</h2>
          <div className="button-row">
            <CopyScoreToEditorButton lang={resolved.lang} musicXml={musicXml} />
          </div>
          <div className="osmd-panel">
            <VerovioViewer musicXml={musicXml} />
          </div>
        </section>
      )}
    </main>
  );
}
