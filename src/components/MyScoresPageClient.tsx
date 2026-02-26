"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { localePath } from "@/lib/locales";
import { listMyScoresPaginated, type CloudScore } from "@/lib/firestore";

type Props = {
  lang: string;
  pageSize?: number;
};

export default function MyScoresPageClient({ lang, pageSize = 20 }: Props) {
  const { user, loading } = useAuth();
  const isJa = lang === "ja";
  const [page, setPage] = useState(1);
  const [cursorByPage, setCursorByPage] = useState<Record<number, string | null>>({
    1: null,
  });
  const [scores, setScores] = useState<CloudScore[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setIsFetching(true);
    });

    listMyScoresPaginated(user.uid, pageSize, cursorByPage[page])
      .then((result) => {
        if (cancelled) return;
        setScores(result.items);
        setHasNext(!!result.nextCursor);
        if (result.nextCursor) {
          setCursorByPage((prev) =>
            prev[page + 1] ? prev : { ...prev, [page + 1]: result.nextCursor }
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, page, pageSize, cursorByPage]);

  const emptyText = useMemo(
    () =>
      isJa
        ? "クラウド保存された楽譜はありません。エディタで保存してください。"
        : "No cloud scores found. Save a score from the editor first.",
    [isJa]
  );

  if (loading) {
    return <p>{isJa ? "読み込み中..." : "Loading..."}</p>;
  }

  if (!user) {
    return (
      <p>
        {isJa
          ? "このページを見るにはログインしてください。"
          : "Please sign in to view your scores."}
      </p>
    );
  }

  return (
    <>
      {isFetching ? (
        <p>{isJa ? "読み込み中..." : "Loading..."}</p>
      ) : scores.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <div className="content-grid">
          {scores.map((score) => (
            <article key={score.id} className="content-card">
              <h2>{score.title}</h2>
              <p className="legal-updated">
                {isJa ? "更新日" : "Updated"}: {score.updatedAt.toLocaleDateString()}
              </p>
              <p>
                {score.isPublic
                  ? isJa
                    ? "公開中"
                    : "Public"
                  : isJa
                    ? "非公開"
                    : "Private"}
              </p>
              {score.isPublic && score.publicId && (
                <p>
                  <Link href={localePath(lang, `/community/scores/${score.publicId}`)}>
                    {isJa ? "公開ページを見る" : "Open public page"}
                  </Link>
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="button-row" style={{ marginTop: 24 }}>
        <button
          type="button"
          className="ghost"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1 || isFetching}
        >
          {isJa ? "前へ" : "Previous"}
        </button>
        <span className="helper">{isJa ? `ページ ${page}` : `Page ${page}`}</span>
        <button
          type="button"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!hasNext || isFetching}
        >
          {isJa ? "次へ" : "Next"}
        </button>
      </div>
    </>
  );
}
