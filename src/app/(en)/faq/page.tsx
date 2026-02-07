import type { Metadata } from "next";
import { faqContent } from "@/lib/content";
import { supportedLocales, localePath } from "@/lib/locales";

export const metadata: Metadata = {
  title: "FAQ | Drum Score Lab",
  description:
    "Common questions about drum notation reading, 8 beat practice, and export workflow.",
  alternates: {
    canonical: "/faq",
    languages: Object.fromEntries(
      supportedLocales.map((code) => [code, localePath(code, "/faq")])
    ),
  },
};

export default function FaqPage() {
  const copy = faqContent.en;

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
