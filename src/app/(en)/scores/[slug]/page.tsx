import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { getSampleScoreBySlug, sampleScores } from "@/lib/content";
import CopyScoreToEditorButton from "@/components/CopyScoreToEditorButton";
import VerovioViewer from "@/components/VerovioViewer";
import { supportedLocales, localePath } from "@/lib/locales";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return sampleScores.map((score) => ({ slug: score.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const score = getSampleScoreBySlug(slug);
  if (!score) return {};

  return {
    title: score.en.title,
    description: score.en.description,
    alternates: {
      canonical: `/scores/${slug}`,
      languages: Object.fromEntries(
        supportedLocales.map((code) => [
          code,
          localePath(code, `/scores/${slug}`),
        ])
      ),
    },
  };
}

export default async function ScoreDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const score = getSampleScoreBySlug(slug);
  if (!score) {
    notFound();
  }
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
      <h1>{score.en.title}</h1>
      <p className="legal-updated">
        {score.style} | {score.bpm} BPM | Updated: {score.updatedAt}
      </p>
      <p className="legal-intro">{score.en.description}</p>
      <section className="legal-section">
        <h2>Core Pattern</h2>
        <ul>
          {score.en.pattern.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="legal-section">
        <h2>Practice Tips</h2>
        <ul>
          {score.en.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
      {musicXml && (
        <section className="legal-section">
          <h2>Score Preview</h2>
          <div className="button-row">
            <CopyScoreToEditorButton lang="en" musicXml={musicXml} />
          </div>
          <div className="osmd-panel">
            <VerovioViewer musicXml={musicXml} />
          </div>
        </section>
      )}
    </main>
  );
}
