import { useState } from 'react';
import type { MovieItem } from '../types/movie';

const FAVORITES_KEY = 'zencine_favorites';
const LEGACY_FAVORITES_KEY = 'kpcinema_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<MovieItem[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY) || localStorage.getItem(LEGACY_FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (movie: MovieItem) => {
    setFavorites((prev) => {
      const exists = prev.some((m) => m.slug === movie.slug);
      const updated = exists
        ? prev.filter((m) => m.slug !== movie.slug)
        : [movie, ...prev];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (slug: string) => {
    return favorites.some((m) => m.slug === slug);
  };

  return { favorites, toggleFavorite, isFavorite };
}
