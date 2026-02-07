import type { Metadata } from "next";
import Script from "next/script";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { supportedLocales, localePath } from "@/lib/locales";
import "../globals.css";

export const metadata: Metadata = {
  title: "Drum Notation Editor | Free Drum Score Builder - Drum Score Lab",
  description:
    "Create drum notation for free. Click to input, play back, and export to PDF or MIDI.",
  metadataBase: new URL("https://drum-score.pages.dev"),
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

const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta
          name="google-adsense-account"
          content="ca-pub-1785368984015044"
        />
        <meta
          name="google-site-verification"
          content="XGFaf5nE5HG3J687iKtj7MwbRGs_9RklbwMSeyHIa0M"
        />
        <meta
          name="keywords"
          content="drum notation, drum score, drum notation editor, drum score builder, sheet music editor, MIDI export"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script
          id="gtag-src"
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-ZH793J5EM6"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZH793J5EM6');
          `}
        </Script>
        <Script
          id="adsbygoogle-init"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1785368984015044"
          crossOrigin="anonymous"
        />
        <ThemeProvider>
          <LanguageProvider initialLocale="en">
            <AuthProvider>
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify(appJsonLd),
                }}
              />
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify(webAppJsonLd),
                }}
              />
              <SiteHeader />
              {children}
              <SiteFooter />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
