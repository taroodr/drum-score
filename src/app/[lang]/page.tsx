import DrumGrid from "@/components/DrumGrid";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "ja" }];
}

export default async function LangPage({ params }: PageProps) {
  const resolved = await params;
  if (resolved.lang !== "en" && resolved.lang !== "ja") {
    notFound();
  }
  return <DrumGrid />;
}
