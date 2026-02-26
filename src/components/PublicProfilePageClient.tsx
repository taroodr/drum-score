"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "@/lib/auth";
import { getMyPublicProfile, saveMyPublicProfile } from "@/lib/firestore";
import { isPublicUsername, normalizeUsername } from "@/lib/username";

type Props = {
  initialProfile: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    links: string[];
  };
};

function normalizeLinksFromText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
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

export default function PublicProfilePageClient({ initialProfile }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");

  const [profile, setProfile] = useState(initialProfile);
  const [username, setUsername] = useState(initialProfile.username);
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl || "");
  const [bio, setBio] = useState(initialProfile.bio || "");
  const [linksText, setLinksText] = useState(initialProfile.links.join("\n"));

  useEffect(() => {
    if (!user) {
      setIsOwner(false);
      return;
    }

    let cancelled = false;
    getMyPublicProfile(user.uid, {
      displayName: user.displayName || user.email || "",
      avatarUrl: user.photoURL,
    }).then((myProfile) => {
      if (cancelled) return;
      setIsOwner(myProfile?.username === profile.username);
    });

    return () => {
      cancelled = true;
    };
  }, [user, profile.username]);

  const normalizedUsername = normalizeUsername(username);
  const normalizedDisplayName = displayName.trim();
  const normalizedAvatarUrl = avatarUrl.trim() || null;
  const normalizedBio = bio.trim();
  const normalizedLinks = normalizeLinksFromText(linksText);

  const canSave =
    isPublicUsername(normalizedUsername) &&
    normalizedDisplayName.length > 0 &&
    !saving;

  const safeLinks = useMemo(
    () =>
      profile.links
        .map((item) => sanitizeExternalLink(item))
        .filter((item): item is string => !!item),
    [profile.links]
  );

  async function onSave() {
    if (!user || !isOwner || !canSave) return;
    setSaving(true);
    setMessage("");
    const prevUsername = profile.username;

    const result = await saveMyPublicProfile(user.uid, {
      username: normalizedUsername,
      displayName: normalizedDisplayName,
      avatarUrl: normalizedAvatarUrl,
      bio: normalizedBio,
      links: normalizedLinks,
    });

    setSaving(false);
    if (!result.ok) {
      const errorMessage =
        result.code === "invalid_username"
          ? "Username must be 3-20 chars of lowercase letters, numbers, or _."
          : result.code === "username_taken"
            ? "That username is already taken."
            : result.code === "username_reserved"
              ? "That username is reserved and cannot be used right now."
              : result.code === "username_change_too_soon"
                ? "Username can be changed only once every 30 days."
                : "Failed to save profile.";
      setMessage(errorMessage);
      return;
    }

    const next = {
      username: result.profile.username || normalizedUsername,
      displayName: result.profile.displayName,
      avatarUrl: result.profile.avatarUrl,
      bio: result.profile.bio || null,
      links: result.profile.links,
    };
    setProfile(next);
    setUsername(next.username);
    setDisplayName(next.displayName);
    setAvatarUrl(next.avatarUrl || "");
    setBio(next.bio || "");
    setLinksText(next.links.join("\n"));
    setDialogOpen(false);
    setMessage("");
    setToast("Profile saved.");
    setTimeout(() => {
      setToast("");
    }, 2200);
    if (next.username !== prevUsername) {
      router.replace(`/${next.username}`);
      router.refresh();
    }
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
      {safeLinks.length > 0 && (
        <section className="legal-section">
          <h2>Links</h2>
          <ul>
            {safeLinks.map((href) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                  {href}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner && (
        <div className="button-row">
          <button type="button" onClick={() => setDialogOpen(true)}>
            Edit profile
          </button>
          <button type="button" className="ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}

      {toast && <div className="save-toast">{toast}</div>}

      {dialogOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => !saving && setDialogOpen(false)}
                aria-label="Close"
                disabled={saving}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <label className="profile-field">
                <span>Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  placeholder="taro"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              <p className="helper profile-helper">
                URL: https://drum-score.pages.dev/{normalizedUsername || "..."}
              </p>

              <label className="profile-field">
                <span>Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                />
              </label>

              <label className="profile-field">
                <span>Avatar URL</span>
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
                <span>Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 280))}
                  rows={4}
                  placeholder="Bio (max 280 chars)"
                />
              </label>

              <label className="profile-field">
                <span>Links (one URL per line)</span>
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
              {message && <p className="helper">{message}</p>}
              <div className="button-row" style={{ marginTop: 12 }}>
                <button type="button" onClick={onSave} disabled={!canSave || saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
