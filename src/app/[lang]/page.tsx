import DrumGrid from "@/components/DrumGrid";
import { routeLocales } from "@/lib/locales";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return routeLocales.map((lang) => ({ lang }));
}

export default async function LangPage({ params }: PageProps) {
  const resolved = await params;
  return <DrumGrid />;
}
