import type { Metadata } from "next";
import Script from "next/script";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

export const metadata: Metadata = {
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta
          name="google-adsense-account"
          content="ca-pub-1785368984015044"
        />
        <meta
          name="keywords"
          content="ドラム譜,ドラム譜作成,ドラム譜ソフト,楽譜作成,ドラム譜エディタ"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LanguageProvider>
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
        </LanguageProvider>
      </body>
    </html>
  );
}
