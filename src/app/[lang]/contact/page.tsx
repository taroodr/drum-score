type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return [
    { lang: "nl" },
    { lang: "id" },
    { lang: "de" },
    { lang: "en" },
    { lang: "es" },
    { lang: "fr" },
    { lang: "it" },
    { lang: "pl" },
    { lang: "pt" },
    { lang: "vi" },
    { lang: "tr" },
    { lang: "ru" },
    { lang: "ar" },
    { lang: "th" },
    { lang: "ja" },
    { lang: "zh" },
    { lang: "ko" },
  ];
}

const content = {
  en: {
    title: "Contact",
    intro:
      "For questions, feedback, or business inquiries, please use the form below.",
    responseNote: "We typically respond within 2–3 business days.",
  },
  ja: {
    title: "お問い合わせ",
    intro:
      "ご質問・ご要望・ご相談は、以下のフォームからご連絡ください。",
    responseNote: "通常2〜3営業日以内に返信いたします。",
  },
} as const;

export default async function ContactPage({ params }: PageProps) {
  const resolved = await params;
  const copy = content[resolved.lang === "ja" ? "ja" : "en"];
  return (
    <main className="legal-page">
      <h1>{copy.title}</h1>
      <p>{copy.intro}</p>
      <div className="contact-form">
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLSftolPQPn0tbax9IJK32hDHAelneZSryFKavU5BpZcbUZU56g/viewform?embedded=true"
          title="Contact form"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        >
          Loading…
        </iframe>
      </div>
      <p className="legal-updated">{copy.responseNote}</p>
    </main>
  );
}
