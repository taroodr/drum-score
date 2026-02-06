"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { listScores, deleteScore, duplicateScore, type CloudScore } from "@/lib/firestore";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (score: CloudScore) => void;
};

export default function ScoreList({ isOpen, onClose, onSelect }: Props) {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [scores, setScores] = useState<CloudScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !user) return;

    let cancelled = false;
    setLoading(true);

    listScores(user.uid)
      .then((list) => {
        if (!cancelled && isMountedRef.current) {
          setScores(list);
        }
      })
      .catch((error) => {
        if (!cancelled && isMountedRef.current) {
          console.error("Failed to load scores:", error);
        }
      })
      .finally(() => {
        if (!cancelled && isMountedRef.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  const handleDelete = async (scoreId: string) => {
    if (!user) return;
    if (!window.confirm(t("cloud.deleteConfirm"))) return;

    setDeletingId(scoreId);
    try {
      const success = await deleteScore(user.uid, scoreId);
      if (success && isMountedRef.current) {
        setScores((prev) => prev.filter((s) => s.id !== scoreId));
      }
    } catch (error) {
      console.error("Failed to delete score:", error);
    } finally {
      if (isMountedRef.current) {
        setDeletingId(null);
      }
    }
  };

  const handleDuplicate = async (score: CloudScore) => {
    if (!user) return;

    setDuplicatingId(score.id);
    try {
      const newTitle = `${score.title} (${t("cloud.copy")})`;
      const newScore = await duplicateScore(user.uid, score.id, newTitle);
      if (newScore && isMountedRef.current) {
        setScores((prev) => [newScore, ...prev]);
      }
    } catch (error) {
      console.error("Failed to duplicate score:", error);
    } finally {
      if (isMountedRef.current) {
        setDuplicatingId(null);
      }
    }
  };

  const handleSelect = (score: CloudScore) => {
    onSelect(score);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t("cloud.title")}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="score-list-loading">{t("cloud.loading")}</div>
          ) : scores.length === 0 ? (
            <div className="score-list-empty">{t("cloud.empty")}</div>
          ) : (
            <ul className="score-list">
              {scores.map((score) => (
                <li key={score.id} className="score-item">
                  <button
                    type="button"
                    className="score-item-main"
                    onClick={() => handleSelect(score)}
                  >
                    <span className="score-title">{score.title}</span>
                    <span className="score-date">
                      {score.updatedAt.toLocaleDateString(locale)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="score-action"
                    onClick={() => handleDuplicate(score)}
                    disabled={duplicatingId === score.id}
                    title={t("cloud.duplicate")}
                  >
                    {duplicatingId === score.id ? "..." : "⧉"}
                  </button>
                  <button
                    type="button"
                    className="score-delete"
                    onClick={() => handleDelete(score.id)}
                    disabled={deletingId === score.id}
                    title={t("cloud.delete")}
                  >
                    {deletingId === score.id ? "..." : "×"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
