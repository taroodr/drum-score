import type { Metadata } from "next";
import DrumGrid from "@/components/DrumGrid";
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

function sanitizeExternalLink(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
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
    <main className="legal-page content-page">
      <h1>{profile.displayName}</h1>
      <p className="legal-updated">@{profile.username}</p>
      {profile.bio && <p className="legal-intro">{profile.bio}</p>}
      {profile.avatarUrl && (
        <img
          src={profile.avatarUrl}
          alt={`${profile.displayName} avatar`}
          width={112}
          height={112}
          style={{ borderRadius: 999, border: "1px solid var(--paper-edge)" }}
          referrerPolicy="no-referrer"
        />
      )}
      {profile.links.length > 0 && (
        <section className="legal-section">
          <h2>Links</h2>
          <ul>
            {profile.links.map((link) => {
              const href = sanitizeExternalLink(link);
              if (!href) return null;
              return (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                    {href}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
