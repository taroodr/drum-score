import type { Metadata } from "next";
import Link from "next/link";
import { supportedLocales, localePath } from "@/lib/locales";
import { listPublicScoresServer } from "@/lib/firestorePublicServer";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export const metadata: Metadata = {
  title: "Community Drum Scores | Drum Score Lab",
  description: "Browse public drum scores shared by all users.",
  alternates: {
    canonical: "/community/scores",
    languages: Object.fromEntries(
      supportedLocales.map((code) => [code, localePath(code, "/community/scores")])
    ),
  },
};

export default async function CommunityScoresPage({ searchParams }: PageProps) {
  const resolvedSearch = await searchParams;
  const requestedPage = Number(resolvedSearch.page || "1");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.floor(requestedPage)
    : 1;

  let token: string | undefined;
  let items = [] as Awaited<ReturnType<typeof listPublicScoresServer>>["items"];
  let nextPageToken: string | null = null;
  let actualPage = 1;

  for (let page = 1; page <= currentPage; page += 1) {
    const result = await listPublicScoresServer(20, token);
    items = result.items;
    nextPageToken = result.nextPageToken;
    actualPage = page;
    if (page < currentPage && !nextPageToken) {
      break;
    }
    token = nextPageToken || undefined;
  }

  return (
    <main className="legal-page content-page">
      <h1>Community Scores</h1>
      <p className="legal-intro">
        Publicly shared scores from all users.
      </p>

      {items.length === 0 ? (
        <p>No public scores found.</p>
      ) : (
        <div className="content-grid">
          {items.map((score) => (
            <article key={score.id} className="content-card">
              <h2>
                <Link href={`/community/scores/${score.id}`}>{score.title}</Link>
              </h2>
              {score.authorNameVisible &&
                (score.authorDisplayNameSnapshot || score.authorUsernameSnapshot) && (
                  <div className="community-author">
                    {score.authorUsernameSnapshot ? (
                      <Link
                        href={`/${score.authorUsernameSnapshot}`}
                        className="community-author-avatar-link"
                        aria-label={`Open @${score.authorUsernameSnapshot} profile`}
                      >
                        {score.authorAvatarUrlSnapshot ? (
                          <img
                            src={score.authorAvatarUrlSnapshot}
                            alt=""
                            className="community-author-avatar"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="community-author-fallback">
                            {(score.authorDisplayNameSnapshot ||
                              score.authorUsernameSnapshot ||
                              "U")
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <span className="community-author-avatar-link">
                        {score.authorAvatarUrlSnapshot ? (
                          <img
                            src={score.authorAvatarUrlSnapshot}
                            alt=""
                            className="community-author-avatar"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="community-author-fallback">
                            {(score.authorDisplayNameSnapshot || "U")
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        )}
                      </span>
                    )}
                    <div className="community-author-meta">
                      <p className="community-author-name">
                        {score.authorDisplayNameSnapshot ||
                          (score.authorUsernameSnapshot
                            ? `@${score.authorUsernameSnapshot}`
                            : "Unknown user")}
                      </p>
                      {score.authorUsernameSnapshot && (
                        <p className="community-author-username">
                          <Link href={`/${score.authorUsernameSnapshot}`}>
                            @{score.authorUsernameSnapshot}
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              <p className="legal-updated">
                Updated: {score.updatedAt.toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="button-row" style={{ marginTop: 24 }}>
        <Link
          className={`ghost ${actualPage <= 1 ? "disabled-link" : ""}`}
          href={`/community/scores?page=${Math.max(1, actualPage - 1)}`}
          aria-disabled={actualPage <= 1}
        >
          Previous
        </Link>
        <span className="helper">Page {actualPage}</span>
        <Link
          className={`${!nextPageToken ? "disabled-link" : ""}`}
          href={`/community/scores?page=${actualPage + 1}`}
          aria-disabled={!nextPageToken}
        >
          Next
        </Link>
      </div>
    </main>
  );
}
