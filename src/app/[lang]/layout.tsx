import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthProvider } from "@/components/AuthProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { supportedLocales, type SupportedLocale } from "@/lib/locales";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const lang = resolved.lang === "ja" ? "ja" : "en";
  const canonical = `/${resolved.lang}`;
  return {
    ...buildMetadata(lang),
    alternates: {
      canonical,
      languages: Object.fromEntries(
        supportedLocales.map((code) => [code, `/${code}`])
      ),
    },
  };
}

export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const resolved = await params;
  const lang = (supportedLocales.includes(resolved.lang as SupportedLocale)
    ? (resolved.lang as SupportedLocale)
    : "en") as SupportedLocale;
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Drum Score Lab",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url: `https://drum-score.pages.dev/${lang}`,
  };
  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Drum Score Lab",
    applicationCategory: "MusicApplication",
    operatingSystem: "Web",
    url: `https://drum-score.pages.dev/${lang}`,
  };
  return (
    <LanguageProvider initialLocale={lang}>
      <AuthProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
        />
        <SiteHeader />
        {children}
        <SiteFooter />
      </AuthProvider>
    </LanguageProvider>
  );
}
