import { useState } from 'react';
import type { WatchHistoryItem } from '../types/movie';

const STORAGE_KEY = 'zencine_watch_history';
const LEGACY_STORAGE_KEY = 'kpcinema_watch_history';

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('LocalStorage error:', e);
      return [];
    }
  });

  const saveProgress = (item: Omit<WatchHistoryItem, 'updatedAt'>) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.slug !== item.slug);
      const updated: WatchHistoryItem[] = [
        { ...item, updatedAt: Date.now() },
        ...filtered,
      ].slice(0, 50); // Lưu tối đa 50 phim đã xem trên mobile/máy tính

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        // Quota exceeded protection: trim to 20 items
        try {
          const trimmed = updated.slice(0, 20);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } catch {
          console.error('Không thể ghi vào localStorage');
        }
      }
      return updated;
    });
  };

  const getSavedProgress = (slug: string): WatchHistoryItem | undefined => {
    return history.find((h) => h.slug === slug);
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
  };

  const removeHistoryItem = (slug: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.slug !== slug);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  return { history, saveProgress, getSavedProgress, clearHistory, removeHistoryItem };
}
