type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

type FirestoreListResponse = {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
};

export type PublicProfile = {
  username: string;
  ownerUid: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  links: string[];
  createdAt: Date;
  updatedAt: Date;
};

function fromFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map((item) =>
      fromFirestoreValue(item)
    );
  }
  if ("mapValue" in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([key, fieldValue]) => [
        key,
        fromFirestoreValue(fieldValue),
      ])
    );
  }
  return null;
}

function parseDate(value: unknown, fallback: Date = new Date()): Date {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function toPublicProfile(doc: FirestoreDocument): PublicProfile {
  const fields = doc.fields || {};
  const parsed = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)])
  ) as Record<string, unknown>;

  const username =
    typeof parsed.username === "string"
      ? parsed.username.toLowerCase()
      : doc.name.split("/").at(-1)?.toLowerCase() || "";

  const displayName =
    typeof parsed.displayName === "string" && parsed.displayName.trim()
      ? parsed.displayName.trim()
      : username;

  const avatarUrlValue =
    typeof parsed.avatarUrl === "string"
      ? parsed.avatarUrl
      : typeof parsed.photoURL === "string"
        ? parsed.photoURL
        : typeof parsed.avatar_url === "string"
          ? parsed.avatar_url
          : null;

  return {
    username,
    ownerUid: typeof parsed.ownerUid === "string" ? parsed.ownerUid : "",
    displayName,
    avatarUrl: avatarUrlValue && avatarUrlValue.trim() ? avatarUrlValue : null,
    bio:
      typeof parsed.bio === "string" && parsed.bio.trim()
        ? parsed.bio.trim()
        : null,
    links: asStringArray(parsed.links),
    createdAt: parseDate(parsed.createdAt, parseDate(doc.createTime)),
    updatedAt: parseDate(parsed.updatedAt, parseDate(doc.updateTime)),
  };
}

function getBaseUrl() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/publicProfiles`;
}

export async function getPublicProfileServer(
  username: string
): Promise<PublicProfile | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/${encodeURIComponent(username)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as FirestoreDocument;
    return toPublicProfile(payload);
  } catch {
    return null;
  }
}

async function listPublicProfilesServer(
  pageSize = 100,
  pageToken?: string
): Promise<{ items: PublicProfile[]; nextPageToken: string | null }> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return { items: [], nextPageToken: null };

  const url = new URL(baseUrl);
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("orderBy", "updatedAt desc");
  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return { items: [], nextPageToken: null };
    const payload = (await res.json()) as FirestoreListResponse;
    const items = (payload.documents || []).map((doc) => toPublicProfile(doc));
    return {
      items,
      nextPageToken: payload.nextPageToken || null,
    };
  } catch {
    return { items: [], nextPageToken: null };
  }
}

export async function listPublicProfilesForSitemap(limitCount = 200) {
  const collected: PublicProfile[] = [];
  let token: string | undefined;

  while (collected.length < limitCount) {
    const { items, nextPageToken } = await listPublicProfilesServer(
      Math.min(100, limitCount - collected.length),
      token
    );
    if (items.length === 0) break;
    collected.push(...items);
    if (!nextPageToken) break;
    token = nextPageToken;
  }

  return collected;
}
