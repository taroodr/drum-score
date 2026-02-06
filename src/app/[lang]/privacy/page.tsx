type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return supportedLocales.map((lang) => ({ lang }));
}

const content = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: 2026-02-07",
    intro:
      "Thank you for using Drum Score Lab. This page explains our privacy policy.",
    auth: {
      heading: "User Authentication",
      body:
        "We use Google Sign-In to provide login functionality. When you log in, we collect and store the following information:",
      service: "Firebase Authentication / Google LLC",
      policyLabel: "Google privacy policy",
      policyUrl: "https://policies.google.com/",
      dataLabel: "Data collected",
      data: [
        "Google account email address",
        "Display name",
        "Profile picture URL",
        "User ID (unique identifier)",
      ],
      purpose: "This information is used to identify you and enable cloud save functionality.",
    },
    storage: {
      heading: "Data Storage",
      body:
        "When you save scores to the cloud, your data is stored in Firebase Firestore.",
      service: "Firebase Firestore / Google LLC",
      policyLabel: "Google privacy policy",
      policyUrl: "https://policies.google.com/",
      dataLabel: "Data stored",
      data: [
        "Score title",
        "Score data (notes, measures, settings)",
        "Created and updated timestamps",
      ],
      purpose: "Your scores are stored securely and only accessible by you when logged in.",
    },
    deletion: {
      heading: "Data Deletion",
      body:
        "You can delete your saved scores at any time from within the app. If you wish to delete your account and all associated data, please contact us via the Contact page.",
    },
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
        "Cookies are used for authentication, analytics, and advertising. You can disable personalized ads or opt out of third-party cookies using the links below.",
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
    updated: "最終更新日: 2026-02-07",
    intro:
      "Drum Score Lab をご利用いただきありがとうございます。本ページではプライバシーポリシーを記載します。",
    auth: {
      heading: "ユーザー認証",
      body:
        "ログイン機能の提供のため、Google ログインを利用しています。ログイン時に以下の情報を取得・保存します。",
      service: "Firebase Authentication / Google LLC",
      policyLabel: "Google のポリシーと規約",
      policyUrl: "https://policies.google.com/",
      dataLabel: "取得する情報",
      data: [
        "Google アカウントのメールアドレス",
        "表示名",
        "プロフィール画像の URL",
        "ユーザー ID（一意の識別子）",
      ],
      purpose: "これらの情報はユーザーの識別およびクラウド保存機能の提供に使用されます。",
    },
    storage: {
      heading: "データの保存",
      body:
        "スコアをクラウドに保存する際、Firebase Firestore にデータが保存されます。",
      service: "Firebase Firestore / Google LLC",
      policyLabel: "Google のポリシーと規約",
      policyUrl: "https://policies.google.com/",
      dataLabel: "保存されるデータ",
      data: [
        "スコアのタイトル",
        "スコアデータ（ノート、小節数、設定など）",
        "作成日時・更新日時",
      ],
      purpose: "スコアは安全に保存され、ログイン中のご本人のみがアクセスできます。",
    },
    deletion: {
      heading: "データの削除",
      body:
        "保存したスコアはアプリ内からいつでも削除できます。アカウントおよび関連するすべてのデータの削除をご希望の場合は、お問い合わせページよりご連絡ください。",
    },
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
        "認証、アクセス解析、広告配信には Cookie を使用します。以下のリンクからパーソナライズ広告の無効化等が可能です。",
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
  const lang = resolved.lang === "ja" ? "ja" : "en";
  const copy = content[resolved.lang === "ja" ? "ja" : "en"];
  return (
    <main className="legal-page">
      <link rel="canonical" href={`https://drum-score.pages.dev/${lang}/privacy`} />
      <h1>{copy.title}</h1>
      <p className="legal-updated">{copy.updated}</p>
      <p className="legal-intro">{copy.intro}</p>

      <section className="legal-section">
        <h2>{copy.auth.heading}</h2>
        <p>{copy.auth.body}</p>
        <p className="legal-service">{copy.auth.service}</p>
        <p>
          <a href={copy.auth.policyUrl} target="_blank" rel="noreferrer">
            {copy.auth.policyLabel}
          </a>
        </p>
        <h3>{copy.auth.dataLabel}</h3>
        <ul>
          {copy.auth.data.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{copy.auth.purpose}</p>
      </section>

      <section className="legal-section">
        <h2>{copy.storage.heading}</h2>
        <p>{copy.storage.body}</p>
        <p className="legal-service">{copy.storage.service}</p>
        <p>
          <a href={copy.storage.policyUrl} target="_blank" rel="noreferrer">
            {copy.storage.policyLabel}
          </a>
        </p>
        <h3>{copy.storage.dataLabel}</h3>
        <ul>
          {copy.storage.data.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{copy.storage.purpose}</p>
      </section>

      <section className="legal-section">
        <h2>{copy.deletion.heading}</h2>
        <p>{copy.deletion.body}</p>
      </section>

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
import { supportedLocales } from "@/lib/locales";
