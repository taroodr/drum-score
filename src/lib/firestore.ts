import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  writeBatch,
  runTransaction,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { isPublicUsername, normalizeUsername } from "./username";

export type SavedGrid = {
  version: 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1;
  measures: number;
  beatsPerMeasure: number;
  subdivisions: number;
  notes: { row: number; tick: number; duration: number; type?: string }[];
  subdivisionsPerMeasure?: number[];
  subdivisionsPerBeat?: number[];
  tripletBeats?: string[];
};

export type CloudScore = {
  id: string;
  title: string;
  data: SavedGrid;
  isPublic: boolean;
  publicId: string | null;
  authorNameVisible: boolean;
  authorDisplayNameSnapshot: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicScore = {
  id: string;
  ownerUid: string;
  scoreId: string;
  title: string;
  data: SavedGrid;
  authorNameVisible: boolean;
  authorDisplayNameSnapshot: string | null;
  authorUsernameSnapshot: string | null;
  authorAvatarUrlSnapshot: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
};

export type PaginatedScoresResult<T> = {
  items: T[];
  nextCursor: string | null;
};

export type UserPublicProfile = {
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  links: string[];
  updatedAt: Date | null;
  lastUsernameChangeAt: Date | null;
};

export type SavePublicProfileResult =
  | {
      ok: true;
      profile: UserPublicProfile;
    }
  | {
      ok: false;
      code:
        | "not_configured"
        | "invalid_username"
        | "username_taken"
        | "username_reserved"
        | "username_change_too_soon"
        | "unknown";
    };

type FirestoreScore = {
  title: string;
  data: SavedGrid;
  isPublic?: boolean;
  publicId?: string | null;
  authorNameVisible?: boolean;
  authorDisplayNameSnapshot?: string | null;
  publishedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type FirestorePublicScore = {
  ownerUid: string;
  scoreId: string;
  title: string;
  data: SavedGrid;
  authorNameVisible: boolean;
  authorDisplayNameSnapshot?: string | null;
  authorUsernameSnapshot?: string | null;
  authorAvatarUrlSnapshot?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp;
};

type FirestoreUserProfile = {
  username?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string;
  links?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastUsernameChangeAt?: Timestamp | null;
};

type FirestoreUsernameReservation = {
  ownerUid: string;
  username: string;
  reservedUntil: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const USERNAME_CHANGE_INTERVAL_DAYS = 30;
const USERNAME_RESERVE_DAYS = 90;

function getScoresCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "scores");
}

function getPublicScoresCollection() {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "publicScores");
}

function getUserProfileDoc(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return doc(db, "users", userId, "profile", "main");
}

function getPublicProfilesCollection() {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "publicProfiles");
}

function getUsernameReservationsCollection() {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "usernameReservations");
}

export function createPublicId(userId: string, scoreId: string): string {
  return `${userId}_${scoreId}`;
}

function toDate(timestamp?: Timestamp | null): Date | null {
  if (!timestamp) return null;
  return timestamp.toDate();
}

function normalizeLinks(links: string[]): string[] {
  return links
    .map((link) => link.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function toUserPublicProfile(
  data: FirestoreUserProfile | null | undefined,
  fallbackDisplayName?: string | null,
  fallbackAvatarUrl?: string | null
): UserPublicProfile {
  const displayName =
    typeof data?.displayName === "string" && data.displayName.trim()
      ? data.displayName.trim()
      : (fallbackDisplayName || "").trim();

  const avatarUrl =
    typeof data?.avatarUrl === "string" && data.avatarUrl.trim()
      ? data.avatarUrl.trim()
      : fallbackAvatarUrl && fallbackAvatarUrl.trim()
        ? fallbackAvatarUrl.trim()
        : null;

  return {
    username:
      typeof data?.username === "string" && data.username.trim()
        ? normalizeUsername(data.username)
        : null,
    displayName,
    avatarUrl,
    bio: typeof data?.bio === "string" ? data.bio.trim() : "",
    links: Array.isArray(data?.links) ? normalizeLinks(data.links) : [],
    updatedAt: toDate(data?.updatedAt),
    lastUsernameChangeAt: toDate(data?.lastUsernameChangeAt ?? null),
  };
}

function toCloudScore(docId: string, data: FirestoreScore): CloudScore {
  return {
    id: docId,
    title: data.title,
    data: data.data,
    isPublic: !!data.isPublic,
    publicId: data.publicId ?? null,
    authorNameVisible: !!data.authorNameVisible,
    authorDisplayNameSnapshot: data.authorDisplayNameSnapshot ?? null,
    publishedAt: toDate(data.publishedAt),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

function toPublicScore(docId: string, data: FirestorePublicScore): PublicScore {
  return {
    id: docId,
    ownerUid: data.ownerUid,
    scoreId: data.scoreId,
    title: data.title,
    data: data.data,
    authorNameVisible: !!data.authorNameVisible,
    authorDisplayNameSnapshot: data.authorDisplayNameSnapshot ?? null,
    authorUsernameSnapshot: data.authorUsernameSnapshot ?? null,
    authorAvatarUrlSnapshot: data.authorAvatarUrlSnapshot ?? null,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    publishedAt: data.publishedAt?.toDate() || new Date(),
  };
}

async function resolveCursorDoc(
  docs: QueryDocumentSnapshot<DocumentData>[],
  cursor: string | null | undefined
) {
  if (!cursor) return null;
  return docs.find((item) => item.id === cursor) ?? null;
}

export async function saveScore(
  userId: string,
  title: string,
  data: SavedGrid,
  scoreId?: string
): Promise<string | null> {
  const scoresRef = getScoresCollection(userId);
  if (!scoresRef) return null;

  try {
    if (scoreId) {
      const docRef = doc(scoresRef, scoreId);
      const existingSnap = await getDoc(docRef);
      const existing = existingSnap.exists()
        ? (existingSnap.data() as FirestoreScore)
        : null;

      await updateDoc(docRef, {
        title,
        data,
        updatedAt: serverTimestamp(),
      });

      if (existing?.isPublic && existing.publicId) {
        const publicScoresRef = getPublicScoresCollection();
        if (publicScoresRef) {
          const publicRef = doc(publicScoresRef, existing.publicId);
          await setDoc(
            publicRef,
            {
              publicId: existing.publicId,
              ownerUid: userId,
              scoreId,
              title,
              data,
              authorNameVisible: !!existing.authorNameVisible,
              authorDisplayNameSnapshot:
                existing.authorDisplayNameSnapshot ?? null,
              createdAt: existing.createdAt ?? serverTimestamp(),
              publishedAt: existing.publishedAt ?? serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      }
      return scoreId;
    } else {
      const docRef = await addDoc(scoresRef, {
        title,
        data,
        isPublic: false,
        publicId: null,
        authorNameVisible: false,
        authorDisplayNameSnapshot: null,
        publishedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    }
  } catch (error) {
    console.error("Failed to save score:", error);
    return null;
  }
}

export async function getScore(
  userId: string,
  scoreId: string
): Promise<CloudScore | null> {
  const scoresRef = getScoresCollection(userId);
  if (!scoresRef) return null;

  try {
    const docRef = doc(scoresRef, scoreId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data() as FirestoreScore;
    return toCloudScore(docSnap.id, data);
  } catch (error) {
    console.error("Failed to get score:", error);
    return null;
  }
}

export async function listScores(userId: string): Promise<CloudScore[]> {
  const scoresRef = getScoresCollection(userId);
  if (!scoresRef) return [];

  try {
    // Try with orderBy first, fall back to unordered if index not ready
    let snapshot;
    try {
      const q = query(scoresRef, orderBy("updatedAt", "desc"));
      snapshot = await getDocs(q);
    } catch {
      // Index may not be ready, fetch without ordering
      snapshot = await getDocs(scoresRef);
    }

    const scores = snapshot.docs.map((item) =>
      toCloudScore(item.id, item.data() as FirestoreScore)
    );

    // Sort client-side if we couldn't use orderBy
    return scores.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error) {
    console.error("Failed to list scores:", error);
    return [];
  }
}

export async function deleteScore(
  userId: string,
  scoreId: string
): Promise<boolean> {
  const scoresRef = getScoresCollection(userId);
  if (!scoresRef) return false;

  try {
    const docRef = doc(scoresRef, scoreId);
    const scoreSnap = await getDoc(docRef);
    const scoreData = scoreSnap.exists()
      ? (scoreSnap.data() as FirestoreScore)
      : null;

    const db = getFirebaseDb();
    if (!db) return false;

    const batch = writeBatch(db);
    batch.delete(docRef);

    if (scoreData?.isPublic && scoreData.publicId) {
      const publicScoresRef = getPublicScoresCollection();
      if (publicScoresRef) {
        const publicRef = doc(publicScoresRef, scoreData.publicId);
        batch.delete(publicRef);
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Failed to delete score:", error);
    return false;
  }
}

export async function duplicateScore(
  userId: string,
  scoreId: string,
  newTitle: string
): Promise<CloudScore | null> {
  const scoresRef = getScoresCollection(userId);
  if (!scoresRef) return null;

  try {
    const docRef = doc(scoresRef, scoreId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const originalData = docSnap.data() as FirestoreScore;
    const newDocRef = await addDoc(scoresRef, {
      title: newTitle,
      data: originalData.data,
      isPublic: false,
      publicId: null,
      authorNameVisible: false,
      authorDisplayNameSnapshot: null,
      publishedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: newDocRef.id,
      title: newTitle,
      data: originalData.data,
      isPublic: false,
      publicId: null,
      authorNameVisible: false,
      authorDisplayNameSnapshot: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error("Failed to duplicate score:", error);
    return null;
  }
}

export async function setScoreVisibility(
  userId: string,
  scoreId: string,
  options: {
    isPublic: boolean;
    authorNameVisible: boolean;
    authorDisplayName?: string | null;
    authorAvatarUrl?: string | null;
  }
): Promise<boolean> {
  const db = getFirebaseDb();
  const scoresRef = getScoresCollection(userId);
  const publicScoresRef = getPublicScoresCollection();
  if (!db || !scoresRef || !publicScoresRef) return false;

  try {
    const scoreRef = doc(scoresRef, scoreId);
    const scoreSnap = await getDoc(scoreRef);
    if (!scoreSnap.exists()) return false;

    const scoreData = scoreSnap.data() as FirestoreScore;
    const publicId = scoreData.publicId ?? createPublicId(userId, scoreId);
    const batch = writeBatch(db);

    if (options.isPublic) {
      const publicRef = doc(publicScoresRef, publicId);
      const profileRef = getUserProfileDoc(userId);
      const profileSnap = profileRef ? await getDoc(profileRef) : null;
      const profileData = profileSnap?.exists()
        ? (profileSnap.data() as FirestoreUserProfile)
        : null;
      const authorDisplayNameSnapshot = options.authorNameVisible
        ? profileData?.displayName?.trim() ||
          options.authorDisplayName ||
          null
        : null;
      const authorUsernameSnapshot = options.authorNameVisible
        ? profileData?.username && isPublicUsername(normalizeUsername(profileData.username))
          ? normalizeUsername(profileData.username)
          : null
        : null;
      const authorAvatarUrlSnapshot = options.authorNameVisible
        ? profileData?.avatarUrl?.trim() ||
          options.authorAvatarUrl?.trim() ||
          null
        : null;

      batch.update(scoreRef, {
        isPublic: true,
        publicId,
        authorNameVisible: options.authorNameVisible,
        authorDisplayNameSnapshot,
        authorUsernameSnapshot,
        authorAvatarUrlSnapshot,
        publishedAt: scoreData.publishedAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(
        publicRef,
        {
          publicId,
          ownerUid: userId,
          scoreId,
          title: scoreData.title,
          data: scoreData.data,
          authorNameVisible: options.authorNameVisible,
          authorDisplayNameSnapshot,
          authorUsernameSnapshot,
          authorAvatarUrlSnapshot,
          createdAt: scoreData.createdAt ?? serverTimestamp(),
          publishedAt: scoreData.publishedAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      if (scoreData.publicId) {
        const publicRef = doc(publicScoresRef, scoreData.publicId);
        batch.delete(publicRef);
      }

      batch.update(scoreRef, {
        isPublic: false,
        publicId: null,
        authorNameVisible: false,
        authorDisplayNameSnapshot: null,
        authorUsernameSnapshot: null,
        authorAvatarUrlSnapshot: null,
        publishedAt: null,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Failed to set score visibility:", error);
    return false;
  }
}

export async function getMyPublicProfile(
  userId: string,
  fallback?: { displayName?: string | null; avatarUrl?: string | null }
): Promise<UserPublicProfile | null> {
  const profileRef = getUserProfileDoc(userId);
  if (!profileRef) return null;

  try {
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      return toUserPublicProfile(
        null,
        fallback?.displayName ?? null,
        fallback?.avatarUrl ?? null
      );
    }
    return toUserPublicProfile(
      snap.data() as FirestoreUserProfile,
      fallback?.displayName ?? null,
      fallback?.avatarUrl ?? null
    );
  } catch (error) {
    console.error("Failed to get my public profile:", error);
    return null;
  }
}

export async function saveMyPublicProfile(
  userId: string,
  input: {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string;
    links?: string[];
  }
): Promise<SavePublicProfileResult> {
  const db = getFirebaseDb();
  const profileRef = getUserProfileDoc(userId);
  const publicProfilesRef = getPublicProfilesCollection();
  const reservationsRef = getUsernameReservationsCollection();
  if (!db || !profileRef || !publicProfilesRef || !reservationsRef) {
    return { ok: false, code: "not_configured" };
  }

  const normalizedUsername = normalizeUsername(input.username);
  if (!isPublicUsername(normalizedUsername)) {
    return { ok: false, code: "invalid_username" };
  }

  const displayName = (input.displayName || "").trim();
  const avatarUrl = (input.avatarUrl || "").trim() || null;
  const bio = (input.bio || "").trim().slice(0, 280);
  const links = normalizeLinks(input.links || []);
  const nowMs = Date.now();
  const nowTs = Timestamp.now();

  try {
    const profile = await runTransaction(db, async (tx) => {
      const currentProfileSnap = await tx.get(profileRef);
      const currentProfile = currentProfileSnap.exists()
        ? (currentProfileSnap.data() as FirestoreUserProfile)
        : null;
      const currentUsername =
        typeof currentProfile?.username === "string" && currentProfile.username
          ? normalizeUsername(currentProfile.username)
          : null;
      const isUsernameChanging =
        !!currentUsername && currentUsername !== normalizedUsername;

      if (isUsernameChanging && currentProfile?.lastUsernameChangeAt) {
        const lastChangeMs = currentProfile.lastUsernameChangeAt.toMillis();
        const minIntervalMs =
          USERNAME_CHANGE_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
        if (nowMs - lastChangeMs < minIntervalMs) {
          throw new Error("username_change_too_soon");
        }
      }

      const nextPublicRef = doc(publicProfilesRef, normalizedUsername);
      const nextPublicSnap = await tx.get(nextPublicRef);
      if (nextPublicSnap.exists()) {
        const ownerUid = (nextPublicSnap.data().ownerUid as string) || "";
        if (ownerUid && ownerUid !== userId) {
          throw new Error("username_taken");
        }
      }

      const nextReservationRef = doc(reservationsRef, normalizedUsername);
      const nextReservationSnap = await tx.get(nextReservationRef);
      if (nextReservationSnap.exists()) {
        const reservation = nextReservationSnap.data() as FirestoreUsernameReservation;
        const isReserved =
          reservation.ownerUid !== userId &&
          reservation.reservedUntil &&
          reservation.reservedUntil.toMillis() > nowMs;
        if (isReserved) {
          throw new Error("username_reserved");
        }
      }

      if (currentUsername && currentUsername !== normalizedUsername) {
        const oldPublicRef = doc(publicProfilesRef, currentUsername);
        const oldPublicSnap = await tx.get(oldPublicRef);
        if (oldPublicSnap.exists()) {
          const oldOwnerUid = (oldPublicSnap.data().ownerUid as string) || "";
          if (oldOwnerUid === userId) {
            tx.delete(oldPublicRef);
          }
        }

        const oldReservationRef = doc(reservationsRef, currentUsername);
        const reservedUntil = Timestamp.fromMillis(
          nowMs + USERNAME_RESERVE_DAYS * 24 * 60 * 60 * 1000
        );
        tx.set(oldReservationRef, {
          ownerUid: userId,
          username: currentUsername,
          reservedUntil,
          createdAt: nowTs,
          updatedAt: nowTs,
        });
      }

      tx.set(
        doc(publicProfilesRef, normalizedUsername),
        {
          ownerUid: userId,
          username: normalizedUsername,
          displayName: displayName || normalizedUsername,
          avatarUrl,
          bio,
          links,
          createdAt: currentProfile?.createdAt ?? nowTs,
          updatedAt: nowTs,
        },
        { merge: true }
      );

      tx.set(
        profileRef,
        {
          username: normalizedUsername,
          displayName: displayName || normalizedUsername,
          avatarUrl,
          bio,
          links,
          createdAt: currentProfile?.createdAt ?? nowTs,
          updatedAt: nowTs,
          lastUsernameChangeAt: isUsernameChanging ? nowTs : currentProfile?.lastUsernameChangeAt ?? nowTs,
        },
        { merge: true }
      );

      return toUserPublicProfile(
        {
          username: normalizedUsername,
          displayName: displayName || normalizedUsername,
          avatarUrl,
          bio,
          links,
          updatedAt: nowTs,
          lastUsernameChangeAt:
            isUsernameChanging || !currentProfile?.lastUsernameChangeAt
              ? nowTs
              : currentProfile.lastUsernameChangeAt,
        },
        displayName || normalizedUsername,
        avatarUrl
      );
    });

    return { ok: true, profile };
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "unknown";
    if (
      code === "invalid_username" ||
      code === "username_taken" ||
      code === "username_reserved" ||
      code === "username_change_too_soon"
    ) {
      return { ok: false, code };
    }
    console.error("Failed to save public profile:", error);
    return { ok: false, code: "unknown" };
  }
}

export async function listMyScoresPaginated(
  userId: string,
  pageSize = 20,
  cursor?: string | null
): Promise<PaginatedScoresResult<CloudScore>> {
  const scoresRef = getScoresCollection(userId);
  if (!scoresRef) return { items: [], nextCursor: null };

  try {
    const baseQuery = query(scoresRef, orderBy("updatedAt", "desc"));
    const baseSnap = await getDocs(baseQuery);
    const cursorDoc = await resolveCursorDoc(baseSnap.docs, cursor);
    const pagedQuery = cursorDoc
      ? query(scoresRef, orderBy("updatedAt", "desc"), startAfter(cursorDoc), limit(pageSize))
      : query(scoresRef, orderBy("updatedAt", "desc"), limit(pageSize));
    const snapshot = await getDocs(pagedQuery);
    const items = snapshot.docs.map((item) =>
      toCloudScore(item.id, item.data() as FirestoreScore)
    );
    const nextCursor =
      snapshot.docs.length === pageSize
        ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null
        : null;
    return { items, nextCursor };
  } catch (error) {
    console.error("Failed to list paginated my scores:", error);
    return { items: [], nextCursor: null };
  }
}

export async function listPublicScoresPaginated(
  pageSize = 20,
  cursor?: string | null
): Promise<PaginatedScoresResult<PublicScore>> {
  const publicScoresRef = getPublicScoresCollection();
  if (!publicScoresRef) return { items: [], nextCursor: null };

  try {
    const baseQuery = query(publicScoresRef, orderBy("updatedAt", "desc"));
    const baseSnap = await getDocs(baseQuery);
    const cursorDoc = await resolveCursorDoc(baseSnap.docs, cursor);
    const pagedQuery = cursorDoc
      ? query(
          publicScoresRef,
          orderBy("updatedAt", "desc"),
          startAfter(cursorDoc),
          limit(pageSize)
        )
      : query(publicScoresRef, orderBy("updatedAt", "desc"), limit(pageSize));
    const snapshot = await getDocs(pagedQuery);
    const items = snapshot.docs.map((item) =>
      toPublicScore(item.id, item.data() as FirestorePublicScore)
    );
    const nextCursor =
      snapshot.docs.length === pageSize
        ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null
        : null;
    return { items, nextCursor };
  } catch (error) {
    console.error("Failed to list paginated public scores:", error);
    return { items: [], nextCursor: null };
  }
}

export async function getPublicScoreById(publicId: string): Promise<PublicScore | null> {
  const publicScoresRef = getPublicScoresCollection();
  if (!publicScoresRef) return null;

  try {
    const docRef = doc(publicScoresRef, publicId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return toPublicScore(snap.id, snap.data() as FirestorePublicScore);
  } catch (error) {
    console.error("Failed to get public score:", error);
    return null;
  }
}
