import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supportedLocales, localePath } from "@/lib/locales";
import { getPublicScoreServer } from "@/lib/firestorePublicServer";
import CopyScoreToEditorButton from "@/components/CopyScoreToEditorButton";
import VerovioViewer from "@/components/VerovioViewer";
import { buildMusicXml, type NoteType } from "@/lib/musicXml";

type PageProps = {
  params: Promise<{ lang: string; id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const isJa = resolved.lang === "ja";
  const score = await getPublicScoreServer(resolved.id);
  if (!score) return {};

  const title = isJa
    ? `${score.title} | 公開ドラム譜`
    : `${score.title} | Community Drum Score`;
  const description = score.authorNameVisible && score.authorDisplayNameSnapshot
    ? isJa
      ? `${score.authorDisplayNameSnapshot} が公開したドラム譜面。`
      : `Public drum score by ${score.authorDisplayNameSnapshot}.`
    : isJa
      ? "Drum Score Labコミュニティの公開譜面。"
      : "Public drum score from Drum Score Lab community.";

  return {
    title,
    description,
    alternates: {
      canonical: localePath(resolved.lang, `/community/scores/${resolved.id}`),
      languages: Object.fromEntries(
        supportedLocales.map((code) => [
          code,
          localePath(code, `/community/scores/${resolved.id}`),
        ])
      ),
    },
  };
}

export default async function CommunityScoreDetailPage({ params }: PageProps) {
  const resolved = await params;
  const isJa = resolved.lang === "ja";
  const score = await getPublicScoreServer(resolved.id);
  if (!score) notFound();

  const notesMap = new Map<string, { duration: number; type: NoteType }>();
  score.data.notes.forEach((note) => {
    if (
      typeof note.row === "number" &&
      typeof note.tick === "number" &&
      typeof note.duration === "number"
    ) {
      notesMap.set(`${note.row}:${note.tick}`, {
        duration: note.duration,
        type: (note.type as NoteType) || "normal",
      });
    }
  });
  const musicXml = buildMusicXml({
    measures: score.data.measures,
    beatsPerMeasure: score.data.beatsPerMeasure,
    ticksPerBeat: 12,
    notes: notesMap,
    subdivisionsByBeat: score.data.subdivisionsPerBeat,
  });

  return (
    <main className="legal-page content-page">
      <h1>{score.title}</h1>
      <p className="legal-updated">
        {isJa ? "更新日" : "Updated"}: {score.updatedAt.toLocaleDateString()}
      </p>
      {score.authorNameVisible && score.authorDisplayNameSnapshot && (
        <p>{isJa ? "投稿者" : "By"}: {score.authorDisplayNameSnapshot}</p>
      )}
      <section className="legal-section">
        <h2>{isJa ? "譜面プレビュー" : "Score Preview"}</h2>
        <div className="button-row">
          <CopyScoreToEditorButton lang={resolved.lang} musicXml={musicXml} />
        </div>
      </section>
      <div className="osmd-panel">
        <VerovioViewer musicXml={musicXml} />
      </div>
    </main>
  );
}
