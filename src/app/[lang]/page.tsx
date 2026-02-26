import type { Metadata } from "next";
import DrumGrid from "@/components/DrumGrid";
import PublicProfilePageClient from "@/components/PublicProfilePageClient";
import { routeLocales } from "@/lib/locales";
import { notFound } from "next/navigation";
import { getPublicProfileServer } from "@/lib/publicProfilesServer";
import { isPublicUsername, normalizeUsername } from "@/lib/username";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return routeLocales.map((lang) => ({ lang }));
}

function isRouteLocaleSegment(value: string) {
  return routeLocales.includes(value as (typeof routeLocales)[number]);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  if (isRouteLocaleSegment(resolved.lang)) {
    return {};
  }

  const username = normalizeUsername(resolved.lang);
  if (!isPublicUsername(username)) {
    return {
      title: "Profile not found | Drum Score Lab",
      robots: { index: false, follow: false },
    };
  }

  const profile = await getPublicProfileServer(username);
  if (!profile) {
    return {
      title: "Profile not found | Drum Score Lab",
      robots: { index: false, follow: false },
    };
  }

  const title = `${profile.displayName} (@${profile.username}) | Drum Score Lab`;
  const description =
    profile.bio || `Public profile for @${profile.username} on Drum Score Lab.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${profile.username}`,
    },
    openGraph: {
      title,
      description,
      images: [profile.avatarUrl || "/ogp.svg"],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [profile.avatarUrl || "/ogp.svg"],
    },
  };
}

export default async function LangPage({ params }: PageProps) {
  const resolved = await params;
  if (isRouteLocaleSegment(resolved.lang)) {
    return <DrumGrid />;
  }

  const username = normalizeUsername(resolved.lang);
  if (!isPublicUsername(username)) {
    notFound();
  }

  const profile = await getPublicProfileServer(username);
  if (!profile) {
    notFound();
  }

  return (
    <PublicProfilePageClient
      initialProfile={{
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        links: profile.links,
      }}
    />
  );
}
