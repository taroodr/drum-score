import type { Metadata } from "next";
import Link from "next/link";
import { supportedLocales, routeLocales, localePath } from "@/lib/locales";
import { listPublicScoresServer } from "@/lib/firestorePublicServer";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string }>;
};

export function generateStaticParams() {
  return routeLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const isJa = resolved.lang === "ja";
  return {
    title: isJa ? "公開コミュニティ譜面 | Drum Score Lab" : "Community Drum Scores | Drum Score Lab",
    description: isJa
      ? "ユーザーが公開したドラム譜面を一覧できます。"
      : "Browse public drum scores shared by all users.",
    alternates: {
      canonical: localePath(resolved.lang, "/community/scores"),
      languages: Object.fromEntries(
        supportedLocales.map((code) => [code, localePath(code, "/community/scores")])
      ),
    },
  };
}

export default async function CommunityScoresPage({ params, searchParams }: PageProps) {
  const resolved = await params;
  const isJa = resolved.lang === "ja";
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
      <h1>{isJa ? "公開コミュニティ譜面" : "Community Scores"}</h1>
      <p className="legal-intro">
        {isJa
          ? "全ユーザーが公開した譜面の一覧です。"
          : "Publicly shared scores from all users."}
      </p>

      {items.length === 0 ? (
        <p>{isJa ? "公開譜面はまだありません。" : "No public scores found."}</p>
      ) : (
        <div className="content-grid">
          {items.map((score) => (
            <article key={score.id} className="content-card">
              <h2>
                <Link href={localePath(resolved.lang, `/community/scores/${score.id}`)}>
                  {score.title}
                </Link>
              </h2>
              {score.authorNameVisible &&
                (score.authorDisplayNameSnapshot || score.authorUsernameSnapshot) && (
                  <div className="community-author">
                    {score.authorUsernameSnapshot ? (
                      <Link
                        href={`/${score.authorUsernameSnapshot}`}
                        className="community-author-avatar-link"
                        aria-label={
                          isJa
                            ? `@${score.authorUsernameSnapshot} のプロフィール`
                            : `Open @${score.authorUsernameSnapshot} profile`
                        }
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
                            : isJa
                              ? "不明ユーザー"
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
                {isJa ? "更新日" : "Updated"}: {score.updatedAt.toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="button-row" style={{ marginTop: 24 }}>
        <Link
          className={`ghost ${actualPage <= 1 ? "disabled-link" : ""}`}
          href={localePath(resolved.lang, `/community/scores?page=${Math.max(1, actualPage - 1)}`)}
          aria-disabled={actualPage <= 1}
        >
          {isJa ? "前へ" : "Previous"}
        </Link>
        <span className="helper">{isJa ? `ページ ${actualPage}` : `Page ${actualPage}`}</span>
        <Link
          className={`${!nextPageToken ? "disabled-link" : ""}`}
          href={localePath(resolved.lang, `/community/scores?page=${actualPage + 1}`)}
          aria-disabled={!nextPageToken}
        >
          {isJa ? "次へ" : "Next"}
        </Link>
      </div>
    </main>
  );
}
