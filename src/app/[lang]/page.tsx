import DrumGrid from "@/components/DrumGrid";
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

export default async function LangPage({ params }: PageProps) {
  const resolved = await params;
  return <DrumGrid />;
}
