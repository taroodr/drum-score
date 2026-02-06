import type { Metadata } from "next";
import { faqContent } from "@/lib/content";
import { supportedLocales } from "@/lib/locales";

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
    title: lang === "ja" ? "よくある質問 | Drum Score Lab" : "FAQ | Drum Score Lab",
    description:
      lang === "ja"
        ? "ドラム譜の読み方、8ビート練習、書き出し方法などよくある質問をまとめています。"
        : "Common questions about drum notation reading, 8 beat practice, and export workflow.",
    alternates: {
      canonical: `/${resolved.lang}/faq`,
      languages: Object.fromEntries(supportedLocales.map((code) => [code, `/${code}/faq`])),
    },
  };
}

export default async function FaqPage({ params }: PageProps) {
  const resolved = await params;
  const copy = faqContent[resolved.lang === "ja" ? "ja" : "en"];

  return (
    <main className="legal-page content-page">
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
