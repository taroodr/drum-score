"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { signInWithGoogle, signOut, isFirebaseConfigured } from "@/lib/auth";
import { useLanguage } from "@/components/LanguageProvider";
import { localePath } from "@/lib/locales";
import { getMyPublicProfile, saveMyPublicProfile } from "@/lib/firestore";
import { isPublicUsername, normalizeUsername, suggestUsername } from "@/lib/username";

export default function AuthButton() {
  const { user, loading } = useAuth();
  const { t, locale } = useLanguage();
  const [configured, setConfigured] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [mustSetUsername, setMustSetUsername] = useState(false);
  const [editingUsername, setEditingUsername] = useState("");
  const [onboardingMessage, setOnboardingMessage] = useState("");
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  useEffect(() => {
    setConfigured(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (!user) {
      setUsername(null);
      setMustSetUsername(false);
      setEditingUsername("");
      setOnboardingMessage("");
      return;
    }
    let cancelled = false;
    getMyPublicProfile(user.uid, {
      displayName: user.displayName || user.email || "",
      avatarUrl: user.photoURL,
    }).then((profile) => {
      if (cancelled) return;
      const existingUsername = profile?.username || null;
      setUsername(existingUsername);
      if (!existingUsername) {
        const seed = user.email?.split("@")[0] || user.displayName || "user";
        setEditingUsername(suggestUsername(seed));
        setMustSetUsername(true);
      } else {
        setMustSetUsername(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSaveInitialUsername() {
    if (!user) return;
    const normalized = normalizeUsername(editingUsername);
    if (!isPublicUsername(normalized)) {
      setOnboardingMessage(
        locale === "ja"
          ? "username は小文字英数字と _ の 3〜20 文字で入力してください。"
          : "Username must be 3-20 chars of lowercase letters, numbers, or _."
      );
      return;
    }

    setSavingOnboarding(true);
    setOnboardingMessage("");
    const result = await saveMyPublicProfile(user.uid, {
      username: normalized,
      displayName: (user.displayName || "").trim() || normalized,
      avatarUrl: user.photoURL || null,
      bio: "",
      links: [],
    });
    setSavingOnboarding(false);

    if (!result.ok) {
      const message =
        result.code === "username_taken"
          ? locale === "ja"
            ? "その username は既に使用されています。"
            : "That username is already taken."
          : result.code === "username_reserved"
            ? locale === "ja"
              ? "その username は現在使えません。別の username を入力してください。"
              : "That username is reserved. Please choose another one."
            : result.code === "username_change_too_soon"
              ? locale === "ja"
                ? "username 変更制限により保存できません。"
                : "Could not save due to username change limits."
              : locale === "ja"
                ? "保存に失敗しました。もう一度お試しください。"
                : "Failed to save. Please try again.";
      setOnboardingMessage(message);
      return;
    }

    setUsername(result.profile.username);
    setEditingUsername(result.profile.username || "");
    setMustSetUsername(false);
    setOnboardingMessage("");
  }

  if (!configured) {
    return null;
  }

  if (loading) {
    return (
      <div className="auth-button-wrap">
        <span className="auth-loading">{t("auth.loading")}</span>
      </div>
    );
  }

  if (user) {
    const profileHref = username
      ? `/${username}`
      : localePath(locale, "/my/scores");
    const fallbackInitial = (user.displayName || user.email || "U")
      .trim()
      .slice(0, 1)
      .toUpperCase();

    return (
      <>
        <div className="auth-button-wrap">
          <Link
            href={profileHref}
            className="auth-user auth-user-icon-only"
            aria-label={locale === "ja" ? "プロフィール" : "Profile"}
            title={username ? `@${username}` : locale === "ja" ? "プロフィール設定" : "Set profile"}
          >
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="auth-avatar"
                referrerPolicy="no-referrer"
              />
            )}
            {!user.photoURL && (
              <span className="auth-avatar auth-avatar-fallback">{fallbackInitial}</span>
            )}
          </Link>
          <button type="button" className="auth-btn ghost" onClick={signOut}>
            {t("auth.logout")}
          </button>
        </div>

        {mustSetUsername && (
          <div className="modal-overlay">
            <div className="modal-content modal-small">
              <div className="modal-header">
                <h3>{locale === "ja" ? "username を登録してください" : "Set your username"}</h3>
              </div>
              <div className="modal-body">
                <p className="helper" style={{ marginBottom: 12 }}>
                  {locale === "ja"
                    ? "最初に公開プロフィール用 username の登録が必要です。"
                    : "A public profile username is required on first sign-in."}
                </p>
                <label className="profile-field">
                  <span>username</span>
                  <input
                    value={editingUsername}
                    onChange={(e) => setEditingUsername(normalizeUsername(e.target.value))}
                    placeholder="taro"
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </label>
                <p className="helper" style={{ marginTop: 8 }}>
                  https://drum-score.pages.dev/{normalizeUsername(editingUsername) || "..."}
                </p>
                {onboardingMessage && (
                  <p className="helper" style={{ marginTop: 8 }}>
                    {onboardingMessage}
                  </p>
                )}
                <div className="button-row" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={handleSaveInitialUsername}
                    disabled={savingOnboarding || !isPublicUsername(normalizeUsername(editingUsername))}
                  >
                    {savingOnboarding
                      ? locale === "ja"
                        ? "保存中..."
                        : "Saving..."
                      : locale === "ja"
                        ? "登録して続行"
                        : "Save and continue"}
                  </button>
                  <button type="button" className="ghost" onClick={signOut} disabled={savingOnboarding}>
                    {locale === "ja" ? "ログアウト" : "Sign out"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="auth-button-wrap">
      <button type="button" className="auth-btn" onClick={signInWithGoogle}>
        <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t("auth.loginWithGoogle")}
      </button>
    </div>
  );
}
