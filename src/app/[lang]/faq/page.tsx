import { supportedLocales } from "@/lib/locales";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return supportedLocales.map((lang) => ({ lang }));
}

const content = {
  en: {
    title: "FAQ",
    updated: "Last updated: 2026-02-02",
    items: [
      {
        question: "How do I write drum notation?",
        answer:
          "Select a division, click the grid to place notes, and use the preview to check the score. You can export to PDF or MIDI.",
      },
      {
        question: "What is the difference between 16th notes and triplets?",
        answer:
          "16th notes divide a beat into 4 equal parts. Triplets divide a beat into 3 equal parts, creating a swing-like feel.",
      },
    ],
  },
  ja: {
    title: "よくある質問",
    updated: "最終更新日: 2026-02-02",
    items: [
      {
        question: "ドラム譜の書き方は？",
        answer:
          "Division を選択し、グリッドをクリックして音符を配置します。プレビューで確認し、PDF/MIDIで書き出せます。",
      },
      {
        question: "16分音符と三連符の違いは？",
        answer:
          "16分音符は1拍を4等分します。三連符は1拍を3等分し、跳ねるようなノリになります。",
      },
    ],
  },
} as const;

export default async function FaqPage({ params }: PageProps) {
  const resolved = await params;
  const lang = resolved.lang === "ja" ? "ja" : "en";
  const copy = content[resolved.lang === "ja" ? "ja" : "en"];
  return (
    <main className="legal-page">
      <link rel="canonical" href={`https://drum-score.pages.dev/${lang}/faq`} />
      <h1>{copy.title}</h1>
      <p className="legal-updated">{copy.updated}</p>
      <div className="faq-list">
        {copy.items.map((item) => (
          <section key={item.question} className="faq-item">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
