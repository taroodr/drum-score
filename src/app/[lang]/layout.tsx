import type { Metadata } from "next";
import Script from "next/script";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  supportedLocales,
  routeLocales,
  localePath,
  type SupportedLocale,
} from "@/lib/locales";
import "../globals.css";

const localeMetadata: Record<string, { title: string; description: string }> = {
  nl: {
    title: "Drumnoten Editor | Gratis Drumscore Maker - Drum Score Lab",
    description:
      "Maak gratis drumnoten. Klik om in te voeren, speel af en exporteer naar PDF of MIDI.",
  },
  id: {
    title: "Editor Notasi Drum | Pembuat Skor Drum Gratis - Drum Score Lab",
    description:
      "Buat notasi drum secara gratis. Klik untuk input, putar, dan ekspor ke PDF atau MIDI.",
  },
  de: {
    title:
      "Schlagzeugnoten-Editor | Kostenloser Drum-Score-Editor - Drum Score Lab",
    description:
      "Erstellen Sie kostenlos Schlagzeugnoten. Klicken zum Eingeben, Abspielen und Exportieren als PDF oder MIDI.",
  },
  es: {
    title:
      "Editor de Partitura de Batería | Creador Gratuito - Drum Score Lab",
    description:
      "Crea partituras de batería gratis. Haz clic para introducir, reproducir y exportar a PDF o MIDI.",
  },
  fr: {
    title:
      "Éditeur de Partition de Batterie | Créateur Gratuit - Drum Score Lab",
    description:
      "Créez des partitions de batterie gratuitement. Cliquez pour saisir, écouter et exporter en PDF ou MIDI.",
  },
  it: {
    title:
      "Editor di Spartiti per Batteria | Creatore Gratuito - Drum Score Lab",
    description:
      "Crea spartiti per batteria gratuitamente. Clicca per inserire, riprodurre ed esportare in PDF o MIDI.",
  },
  pl: {
    title:
      "Edytor Nut Perkusyjnych | Darmowy Kreator Partytury - Drum Score Lab",
    description:
      "Twórz nuty perkusyjne za darmo. Kliknij, aby wprowadzić, odtworzyć i wyeksportować do PDF lub MIDI.",
  },
  pt: {
    title:
      "Editor de Partitura de Bateria | Criador Gratuito - Drum Score Lab",
    description:
      "Crie partituras de bateria gratuitamente. Clique para inserir, reproduzir e exportar para PDF ou MIDI.",
  },
  vi: {
    title:
      "Trình Soạn Nhạc Trống | Công Cụ Tạo Bản Nhạc Miễn Phí - Drum Score Lab",
    description:
      "Tạo bản nhạc trống miễn phí. Nhấp để nhập, phát lại và xuất sang PDF hoặc MIDI.",
  },
  tr: {
    title:
      "Davul Notası Editörü | Ücretsiz Nota Oluşturucu - Drum Score Lab",
    description:
      "Ücretsiz davul notası oluşturun. Giriş yapmak, dinlemek ve PDF veya MIDI olarak dışa aktarmak için tıklayın.",
  },
  ru: {
    title: "Редактор Барабанных Нот | Бесплатный Редактор - Drum Score Lab",
    description:
      "Создавайте барабанные ноты бесплатно. Кликните для ввода, воспроизведения и экспорта в PDF или MIDI.",
  },
  ar: {
    title: "محرر نوتة الطبول | منشئ نوتات مجاني - Drum Score Lab",
    description:
      "أنشئ نوتات الطبول مجانًا. انقر للإدخال والتشغيل والتصدير إلى PDF أو MIDI.",
  },
  th: {
    title:
      "โปรแกรมแก้ไขโน้ตกลอง | เครื่องมือสร้างโน้ตกลองฟรี - Drum Score Lab",
    description:
      "สร้างโน้ตกลองฟรี คลิกเพื่อป้อนข้อมูล เล่นย้อนกลับ และส่งออกเป็น PDF หรือ MIDI",
  },
  ja: {
    title: "ドラム譜作成 | 無料ドラム譜エディタ - Drum Score Lab",
    description:
      "無料でドラム譜を作成・再生・PDF/MIDI書き出しできるドラム譜作成ツール。クリック入力で楽譜作成が可能。",
  },
  zh: {
    title: "鼓谱编辑器 | 免费鼓谱制作工具 - Drum Score Lab",
    description: "免费创建鼓谱。点击输入、播放并导出为 PDF 或 MIDI。",
  },
  ko: {
    title: "드럼 악보 편집기 | 무료 드럼 악보 제작 도구 - Drum Score Lab",
    description:
      "무료로 드럼 악보를 만드세요. 클릭으로 입력하고 재생하며 PDF 또는 MIDI로 내보내기가 가능합니다.",
  },
};

const defaultMeta = {
  title: "Drum Notation Editor | Free Drum Score Builder - Drum Score Lab",
  description:
    "Create drum notation for free. Click to input, play back, and export to PDF or MIDI.",
};

export async function generateStaticParams() {
  return routeLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const meta = localeMetadata[resolved.lang] ?? defaultMeta;
  return {
    title: meta.title,
    description: meta.description,
    metadataBase: new URL("https://drum-score.pages.dev"),
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: ["/ogp.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: ["/ogp.svg"],
    },
    alternates: {
      canonical: localePath(resolved.lang),
      languages: Object.fromEntries(
        supportedLocales.map((code) => [code, localePath(code)])
      ),
    },
  };
}

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

export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const resolved = await params;
  const lang = (
    supportedLocales.includes(resolved.lang as SupportedLocale)
      ? (resolved.lang as SupportedLocale)
      : "en"
  ) as SupportedLocale;
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Drum Score Lab",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url: `https://drum-score.pages.dev${localePath(lang)}`,
  };
  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Drum Score Lab",
    applicationCategory: "MusicApplication",
    operatingSystem: "Web",
    url: `https://drum-score.pages.dev${localePath(lang)}`,
  };
  return (
    <html lang={lang} suppressHydrationWarning>
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
          <LanguageProvider initialLocale={lang}>
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
