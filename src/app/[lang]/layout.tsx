import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";

const buildMetadata = (lang: "en" | "ja"): Metadata => {
  if (lang === "ja") {
    return {
      title: "ドラム譜作成 | 無料ドラム譜エディタ - Drum Score Lab",
      description:
        "無料でドラム譜を作成・再生・PDF/MIDI書き出しできるドラム譜作成ツール。クリック入力で楽譜作成が可能。",
      openGraph: {
        title: "ドラム譜作成 | 無料ドラム譜エディタ - Drum Score Lab",
        description:
          "無料でドラム譜を作成・再生・PDF/MIDI書き出しできるドラム譜作成ツール。",
        images: ["/ogp.svg"],
      },
      twitter: {
        card: "summary_large_image",
        title: "ドラム譜作成 | 無料ドラム譜エディタ - Drum Score Lab",
        description:
          "無料でドラム譜を作成・再生・PDF/MIDI書き出しできるドラム譜作成ツール。",
        images: ["/ogp.svg"],
      },
      alternates: {
        languages: {
          en: "/en",
          ja: "/ja",
        },
      },
    };
  }

  return {
    title: "Drum Notation Editor | Free Drum Score Builder - Drum Score Lab",
    description:
      "Create drum notation for free. Click to input, play back, and export to PDF or MIDI.",
    openGraph: {
      title: "Drum Notation Editor | Free Drum Score Builder - Drum Score Lab",
      description:
        "Create drum notation for free. Click to input, play back, and export to PDF or MIDI.",
      images: ["/ogp.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Drum Notation Editor | Free Drum Score Builder - Drum Score Lab",
      description:
        "Create drum notation for free. Click to input, play back, and export to PDF or MIDI.",
      images: ["/ogp.svg"],
    },
    alternates: {
      languages: {
        nl: "/nl",
        id: "/id",
        de: "/de",
        en: "/en",
        es: "/es",
        fr: "/fr",
        it: "/it",
        pl: "/pl",
        pt: "/pt",
        vi: "/vi",
        tr: "/tr",
        ru: "/ru",
        ar: "/ar",
        th: "/th",
        ja: "/ja",
        zh: "/zh",
        ko: "/ko",
      },
    },
  };
};

const supportedLocales = [
  "nl",
  "id",
  "de",
  "en",
  "es",
  "fr",
  "it",
  "pl",
  "pt",
  "vi",
  "tr",
  "ru",
  "ar",
  "th",
  "ja",
  "zh",
  "ko",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const lang = resolved.lang === "ja" ? "ja" : "en";
  return buildMetadata(lang);
}

export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const resolved = await params;
  const lang = supportedLocales.includes(resolved.lang as (typeof supportedLocales)[number])
    ? (resolved.lang as (typeof supportedLocales)[number])
    : "en";
  return <LanguageProvider initialLocale={lang}>{children}</LanguageProvider>;
}
