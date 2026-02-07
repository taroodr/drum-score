import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
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
        {children}
      </body>
    </html>
  );
}
