import type { Metadata } from "next";
import MyScoresPageClient from "@/components/MyScoresPageClient";
import { supportedLocales, routeLocales, localePath } from "@/lib/locales";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return routeLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const isJa = resolved.lang === "ja";
  return {
    title: isJa ? "マイクラウド譜面 | Drum Score Lab" : "My Cloud Scores | Drum Score Lab",
    description: isJa
      ? "クラウド保存した譜面と公開状況を確認できます。"
      : "Manage your cloud scores and check public links.",
    alternates: {
      canonical: localePath(resolved.lang, "/my/scores"),
      languages: Object.fromEntries(
        supportedLocales.map((code) => [code, localePath(code, "/my/scores")])
      ),
    },
  };
}

export default async function MyScoresPage({ params }: PageProps) {
  const resolved = await params;
  const isJa = resolved.lang === "ja";

  return (
    <main className="legal-page content-page">
      <h1>{isJa ? "マイクラウド譜面" : "My Cloud Scores"}</h1>
      <p className="legal-intro">
        {isJa
          ? "保存済み譜面の公開状態と公開URLを確認できます。"
          : "View your saved scores, publication status, and public URLs."}
      </p>
      <MyScoresPageClient lang={resolved.lang} />
    </main>
  );
}
