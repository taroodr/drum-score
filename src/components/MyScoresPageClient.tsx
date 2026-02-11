"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { localePath } from "@/lib/locales";
import {
  getMyPublicProfile,
  listMyScoresPaginated,
  saveMyPublicProfile,
  type CloudScore,
} from "@/lib/firestore";
import { isPublicUsername, normalizeUsername } from "@/lib/username";

type Props = {
  lang: string;
  pageSize?: number;
};

const SITE_BASE = "https://drum-score.pages.dev";

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

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string>("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [linksText, setLinksText] = useState("");

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

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setProfileLoading(true);
    getMyPublicProfile(user.uid, {
      displayName: user.displayName || user.email || "",
      avatarUrl: user.photoURL,
    })
      .then((profile) => {
        if (cancelled || !profile) return;
        setUsername(profile.username || "");
        setDisplayName(profile.displayName || "");
        setAvatarUrl(profile.avatarUrl || "");
        setBio(profile.bio || "");
        setLinksText(profile.links.join("\n"));
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const emptyText = useMemo(
    () =>
      isJa
        ? "クラウド保存された楽譜はありません。エディタで保存してください。"
        : "No cloud scores found. Save a score from the editor first.",
    [isJa]
  );

  const normalizedUsername = normalizeUsername(username);
  const usernameValid = isPublicUsername(normalizedUsername);

  const profileUrl = normalizedUsername ? `${SITE_BASE}/${normalizedUsername}` : "";

  async function onSaveProfile() {
    if (!user) return;

    const links = linksText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    setProfileSaving(true);
    setProfileMessage("");

    const result = await saveMyPublicProfile(user.uid, {
      username: normalizedUsername,
      displayName: displayName.trim() || normalizedUsername,
      avatarUrl: avatarUrl.trim(),
      bio,
      links,
    });

    if (!result.ok) {
      const msg =
        result.code === "invalid_username"
          ? isJa
            ? "username は小文字英数字と _ の 3〜20 文字で入力してください。予約語は使えません。"
            : "Username must be 3-20 chars of lowercase letters, numbers, or _. Reserved words are not allowed."
          : result.code === "username_taken"
            ? isJa
              ? "その username は既に使用されています。"
              : "That username is already taken."
            : result.code === "username_reserved"
              ? isJa
                ? "その username は保留中のため使用できません。"
                : "That username is reserved and cannot be used right now."
              : result.code === "username_change_too_soon"
                ? isJa
                  ? "username は30日に1回まで変更できます。"
                  : "Username can be changed only once every 30 days."
                : isJa
                  ? "プロフィール保存に失敗しました。"
                  : "Failed to save profile.";
      setProfileMessage(msg);
      setProfileSaving(false);
      return;
    }

    setUsername(result.profile.username || normalizedUsername);
    setDisplayName(result.profile.displayName);
    setAvatarUrl(result.profile.avatarUrl || "");
    setBio(result.profile.bio);
    setLinksText(result.profile.links.join("\n"));
    setProfileMessage(isJa ? "プロフィールを保存しました。" : "Profile saved.");
    setProfileSaving(false);
  }

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
      <section className="content-card profile-editor-card">
        <h2>{isJa ? "公開プロフィール" : "Public Profile"}</h2>
        {profileLoading ? (
          <p>{isJa ? "プロフィールを読み込み中..." : "Loading profile..."}</p>
        ) : (
          <>
            <label className="profile-field">
              <span>{isJa ? "username" : "Username"}</span>
              <input
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                placeholder="taro"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <p className="helper profile-helper">{isJa ? "URL" : "URL"}: {profileUrl || "-"}</p>

            <label className="profile-field">
              <span>{isJa ? "表示名" : "Display name"}</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={isJa ? "表示名" : "Display name"}
              />
            </label>

            <label className="profile-field">
              <span>{isJa ? "アバターURL" : "Avatar URL"}</span>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>

            <label className="profile-field">
              <span>{isJa ? "自己紹介" : "Bio"}</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 280))}
                rows={4}
                placeholder={isJa ? "自己紹介（最大280文字）" : "Bio (max 280 chars)"}
              />
            </label>

            <label className="profile-field">
              <span>{isJa ? "リンク（1行1URL）" : "Links (one URL per line)"}</span>
              <textarea
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                rows={4}
                placeholder={"https://x.com/yourname\nhttps://your-site.example"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>

            {profileMessage && <p className="helper">{profileMessage}</p>}

            <div className="button-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={onSaveProfile}
                disabled={profileSaving || !usernameValid || !displayName.trim()}
              >
                {profileSaving
                  ? isJa
                    ? "保存中..."
                    : "Saving..."
                  : isJa
                    ? "プロフィールを保存"
                    : "Save profile"}
              </button>
              {usernameValid && (
                <Link href={`/${normalizedUsername}`} className="cta" style={{ padding: "8px 14px" }}>
                  @{normalizedUsername}
                </Link>
              )}
            </div>
          </>
        )}
      </section>

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
