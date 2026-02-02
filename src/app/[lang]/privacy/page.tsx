type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return [
    { lang: "nl" },
    { lang: "id" },
    { lang: "de" },
    { lang: "en" },
    { lang: "es" },
    { lang: "fr" },
    { lang: "it" },
    { lang: "pl" },
    { lang: "pt" },
    { lang: "vi" },
    { lang: "tr" },
    { lang: "ru" },
    { lang: "ar" },
    { lang: "th" },
    { lang: "ja" },
    { lang: "zh" },
    { lang: "ko" },
  ];
}

const content = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: 2026-02-02",
    intro:
      "Thank you for using Drum Score Lab. This page explains our privacy policy.",
    analytics: {
      heading: "Analytics",
      body:
        "We use Google Analytics to measure usage and improve the service.",
      service: "Google Analytics / Google LLC",
      details:
        "It provides page view counts, time on site, device information, and referrers.",
      policyLabel: "Google privacy policy",
      policyUrl: "https://policies.google.com/",
      dataLabel: "Data sent",
      data: [
        "Identifiers such as cookies",
        "Visited URL, page title, and timestamp",
        "Browser/OS/device information, screen size, IP address",
      ],
    },
    ads: {
      heading: "Advertising",
      body:
        "We display ads via Google AdSense, which may use cookies to personalize ads and measure ad performance.",
      service: "Google AdSense / Google LLC",
      policyLabel: "Google privacy policy",
      policyUrl: "https://policies.google.com/",
      dataLabel: "Data sent",
      data: [
        "Identifiers such as cookies",
        "Visited URL, page title, and timestamp",
        "Browser/OS/device information, screen size, IP address",
      ],
    },
    cookies: {
      heading: "Cookies",
      body:
        "Cookies are used for analytics and advertising. You can disable personalized ads or opt out of third-party cookies using the links below.",
      optOutAdsLabel: "Google ad settings",
      optOutAdsUrl: "https://www.google.com/settings/ads",
      optOutNaiLabel: "AboutAds opt-out",
      optOutNaiUrl: "https://www.aboutads.info/",
    },
    contact: {
      heading: "Contact",
      body: "If you have questions, please contact us via the Contact page.",
    },
  },
  ja: {
    title: "プライバシーポリシー",
    updated: "最終更新日: 2026-02-02",
    intro:
      "Drum Score Lab をご利用いただきありがとうございます。本ページではプライバシーポリシーを記載します。",
    analytics: {
      heading: "アクセス解析",
      body:
        "利便性向上や広告効果の測定のため、Google Analytics を利用しています。",
      service: "Google アナリティクス / Google LLC",
      details:
        "閲覧ページのアクセス数、滞在時間、利用環境、流入経路などの分析機能を提供します。",
      policyLabel: "Google のポリシーと規約",
      policyUrl: "https://policies.google.com/",
      dataLabel: "送信される情報",
      data: [
        "Cookie 等の識別子",
        "閲覧している URL やページタイトル、時刻",
        "ブラウザ/OS/端末種別、画面サイズ、IP アドレスなど",
      ],
    },
    ads: {
      heading: "広告配信",
      body:
        "Google AdSense により広告を表示します。広告の配信や効果測定のため、Cookie 等が利用される場合があります。",
      service: "Google AdSense / Google LLC",
      policyLabel: "Google のポリシーと規約",
      policyUrl: "https://policies.google.com/",
      dataLabel: "送信される情報",
      data: [
        "Cookie 等の識別子",
        "閲覧している URL やページタイトル、時刻",
        "ブラウザ/OS/端末種別、画面サイズ、IP アドレスなど",
      ],
    },
    cookies: {
      heading: "Cookie について",
      body:
        "広告配信やアクセス解析には Cookie を使用します。以下のリンクからパーソナライズ広告の無効化等が可能です。",
      optOutAdsLabel: "Google 広告設定",
      optOutAdsUrl: "https://www.google.com/settings/ads",
      optOutNaiLabel: "AboutAds のオプトアウト",
      optOutNaiUrl: "https://www.aboutads.info/",
    },
    contact: {
      heading: "お問い合わせ",
      body: "ご不明点はお問い合わせページよりご連絡ください。",
    },
  },
} as const;

export default async function PrivacyPage({ params }: PageProps) {
  const resolved = await params;
  const copy = content[resolved.lang === "ja" ? "ja" : "en"];
  return (
    <main className="legal-page">
      <h1>{copy.title}</h1>
      <p className="legal-updated">{copy.updated}</p>
      <p className="legal-intro">{copy.intro}</p>

      <section className="legal-section">
        <h2>{copy.analytics.heading}</h2>
        <p>{copy.analytics.body}</p>
        <p className="legal-service">{copy.analytics.service}</p>
        <p>{copy.analytics.details}</p>
        <p>
          <a href={copy.analytics.policyUrl} target="_blank" rel="noreferrer">
            {copy.analytics.policyLabel}
          </a>
        </p>
        <h3>{copy.analytics.dataLabel}</h3>
        <ul>
          {copy.analytics.data.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="legal-section">
        <h2>{copy.ads.heading}</h2>
        <p>{copy.ads.body}</p>
        <p className="legal-service">{copy.ads.service}</p>
        <p>
          <a href={copy.ads.policyUrl} target="_blank" rel="noreferrer">
            {copy.ads.policyLabel}
          </a>
        </p>
        <h3>{copy.ads.dataLabel}</h3>
        <ul>
          {copy.ads.data.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="legal-section">
        <h2>{copy.cookies.heading}</h2>
        <p>{copy.cookies.body}</p>
        <ul>
          <li>
            <a href={copy.cookies.optOutAdsUrl} target="_blank" rel="noreferrer">
              {copy.cookies.optOutAdsLabel}
            </a>
          </li>
          <li>
            <a href={copy.cookies.optOutNaiUrl} target="_blank" rel="noreferrer">
              {copy.cookies.optOutNaiLabel}
            </a>
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>{copy.contact.heading}</h2>
        <p>{copy.contact.body}</p>
      </section>
    </main>
  );
}
