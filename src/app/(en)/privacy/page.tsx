import type { Metadata } from "next";
import { supportedLocales, localePath } from "@/lib/locales";

export const metadata: Metadata = {
  title: "Privacy Policy | Drum Score Lab",
  description: "Privacy policy for Drum Score Lab.",
  alternates: {
    canonical: "/privacy",
    languages: Object.fromEntries(
      supportedLocales.map((code) => [code, localePath(code, "/privacy")])
    ),
  },
};

const copy = {
  title: "Privacy Policy",
  updated: "Last updated: 2026-02-07",
  intro:
    "Thank you for using Drum Score Lab. This page explains our privacy policy.",
  auth: {
    heading: "User Authentication",
    body: "We use Google Sign-In to provide login functionality. When you log in, we collect and store the following information:",
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
    purpose:
      "This information is used to identify you and enable cloud save functionality.",
  },
  storage: {
    heading: "Data Storage",
    body: "When you save scores to the cloud, your data is stored in Firebase Firestore.",
    service: "Firebase Firestore / Google LLC",
    policyLabel: "Google privacy policy",
    policyUrl: "https://policies.google.com/",
    dataLabel: "Data stored",
    data: [
      "Score title",
      "Score data (notes, measures, settings)",
      "Created and updated timestamps",
    ],
    purpose:
      "Your scores are stored securely and only accessible by you when logged in.",
  },
  deletion: {
    heading: "Data Deletion",
    body: "You can delete your saved scores at any time from within the app. If you wish to delete your account and all associated data, please contact us via the Contact page.",
  },
  analytics: {
    heading: "Analytics",
    body: "We use Google Analytics to measure usage and improve the service.",
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
    body: "We display ads via Google AdSense, which may use cookies to personalize ads and measure ad performance.",
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
    body: "Cookies are used for authentication, analytics, and advertising. You can disable personalized ads or opt out of third-party cookies using the links below.",
    optOutAdsLabel: "Google ad settings",
    optOutAdsUrl: "https://www.google.com/settings/ads",
    optOutNaiLabel: "AboutAds opt-out",
    optOutNaiUrl: "https://www.aboutads.info/",
  },
  contact: {
    heading: "Contact",
    body: "If you have questions, please contact us via the Contact page.",
  },
} as const;

export default function PrivacyPage() {
  return (
    <main className="legal-page">
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
            <a
              href={copy.cookies.optOutAdsUrl}
              target="_blank"
              rel="noreferrer"
            >
              {copy.cookies.optOutAdsLabel}
            </a>
          </li>
          <li>
            <a
              href={copy.cookies.optOutNaiUrl}
              target="_blank"
              rel="noreferrer"
            >
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
