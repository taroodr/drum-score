import type { SavedGrid, PublicScore } from "@/lib/firestore";

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

function parseDocumentId(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1] || "";
}

function parseDate(value: unknown, fallback: Date = new Date()): Date {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date;
}

function toPublicScore(doc: FirestoreDocument): PublicScore {
  const fields = doc.fields || {};
  const parsed = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)])
  ) as Record<string, unknown>;

  return {
    id: parseDocumentId(doc.name),
    ownerUid: String(parsed.ownerUid || ""),
    scoreId: String(parsed.scoreId || ""),
    title: String(parsed.title || ""),
    data: (parsed.data || {}) as SavedGrid,
    authorNameVisible: Boolean(parsed.authorNameVisible),
    authorDisplayNameSnapshot:
      typeof parsed.authorDisplayNameSnapshot === "string"
        ? parsed.authorDisplayNameSnapshot
        : null,
    authorUsernameSnapshot:
      typeof parsed.authorUsernameSnapshot === "string"
        ? parsed.authorUsernameSnapshot
        : null,
    authorAvatarUrlSnapshot:
      typeof parsed.authorAvatarUrlSnapshot === "string"
        ? parsed.authorAvatarUrlSnapshot
        : null,
    createdAt: parseDate(parsed.createdAt, parseDate(doc.createTime)),
    updatedAt: parseDate(parsed.updatedAt, parseDate(doc.updateTime)),
    publishedAt: parseDate(parsed.publishedAt, parseDate(doc.createTime)),
  };
}

function getBaseUrl() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/publicScores`;
}

export async function getPublicScoreServer(
  publicId: string
): Promise<PublicScore | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/${encodeURIComponent(publicId)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as FirestoreDocument;
    return toPublicScore(payload);
  } catch {
    return null;
  }
}

export async function listPublicScoresServer(
  pageSize = 20,
  pageToken?: string
): Promise<{ items: PublicScore[]; nextPageToken: string | null }> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return { items: [], nextPageToken: null };

  const url = new URL(baseUrl);
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("orderBy", "updatedAt desc");
  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return { items: [], nextPageToken: null };
    const payload = (await res.json()) as FirestoreListResponse;
    const items = (payload.documents || []).map((doc) => toPublicScore(doc));
    return {
      items,
      nextPageToken: payload.nextPageToken || null,
    };
  } catch {
    return { items: [], nextPageToken: null };
  }
}

export async function listPublicScoresForSitemap(limitCount = 200) {
  const collected: PublicScore[] = [];
  let token: string | undefined;

  while (collected.length < limitCount) {
    const { items, nextPageToken } = await listPublicScoresServer(
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
