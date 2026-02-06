import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

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
  createdAt: Date;
  updatedAt: Date;
};

type FirestoreScore = {
  title: string;
  data: SavedGrid;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

function getScoresCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "scores");
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
      await updateDoc(docRef, {
        title,
        data,
        updatedAt: serverTimestamp(),
      });
      return scoreId;
    } else {
      const docRef = await addDoc(scoresRef, {
        title,
        data,
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
    return {
      id: docSnap.id,
      title: data.title,
      data: data.data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
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

    const scores = snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreScore;
      return {
        id: doc.id,
        title: data.title,
        data: data.data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });

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
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Failed to delete score:", error);
    return false;
  }
}
