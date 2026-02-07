import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { supportedLocales } from "@/lib/locales";
import { localePath } from "@/lib/locales";

export const metadata: Metadata = {
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
    canonical: "/",
    languages: Object.fromEntries(
      supportedLocales.map((code) => [code, localePath(code)])
    ),
  },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Drum Score Lab",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url: "https://drum-score.pages.dev/",
  };
  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Drum Score Lab",
    applicationCategory: "MusicApplication",
    operatingSystem: "Web",
    url: "https://drum-score.pages.dev/",
  };
  return (
    <ThemeProvider>
      <LanguageProvider initialLocale="en">
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
    </ThemeProvider>
  );
}
