import DrumGrid from "@/components/DrumGrid";
type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return supportedLocales.map((lang) => ({ lang }));
}

export default async function LangPage({ params }: PageProps) {
  const resolved = await params;
  return <DrumGrid />;
}
import { supportedLocales } from "@/lib/locales";
