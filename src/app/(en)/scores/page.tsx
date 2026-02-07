import type { Metadata } from "next";
import Link from "next/link";
import { sampleScores } from "@/lib/content";
import { supportedLocales, localePath } from "@/lib/locales";

export const metadata: Metadata = {
  title: "Popular Song Sample Drum Scores",
  description:
    "Sample drum score pages for popular songs, with groove patterns and practice tips.",
  alternates: {
    canonical: "/scores",
    languages: Object.fromEntries(
      supportedLocales.map((code) => [code, localePath(code, "/scores")])
    ),
  },
};

export default function ScoresIndexPage() {
  return (
    <main className="legal-page content-page">
      <h1>Popular Song Sample Scores</h1>
      <p className="legal-intro">
        Sample score pages aligned with song-name search intent, including
        practical groove tips.
      </p>
      <div className="content-grid">
        {sampleScores.map((score) => (
          <article key={score.slug} className="content-card">
            <h2>
              <Link href={`/scores/${score.slug}`}>{score.en.title}</Link>
            </h2>
            <p>{score.en.description}</p>
            <p className="legal-updated">
              {score.style} | {score.bpm} BPM
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
