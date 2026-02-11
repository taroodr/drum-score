import type { Metadata } from "next";
import MyScoresPageClient from "@/components/MyScoresPageClient";
import { supportedLocales, localePath } from "@/lib/locales";

export const metadata: Metadata = {
  title: "My Cloud Scores | Drum Score Lab",
  description: "Manage your cloud scores and check public links.",
  alternates: {
    canonical: "/my/scores",
    languages: Object.fromEntries(
      supportedLocales.map((code) => [code, localePath(code, "/my/scores")])
    ),
  },
};

export default function MyScoresPage() {
  return (
    <main className="legal-page content-page">
      <h1>My Cloud Scores</h1>
      <p className="legal-intro">
        View your saved scores, publication status, and public URLs.
      </p>
      <MyScoresPageClient lang="en" />
    </main>
  );
}
