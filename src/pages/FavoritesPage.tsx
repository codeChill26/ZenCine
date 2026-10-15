import React, { useEffect } from 'react';
import { Heart, Film } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { MovieCard } from '../components/MovieCard';

interface FavoritesPageProps {
  onSelectMovie: (slug: string) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onSelectMovie }) => {
  const { favorites } = useFavorites();

  useEffect(() => {
    const currentHash = window.location.hash || '#/favorites';
    const savedScroll = sessionStorage.getItem(`scroll_pos_${currentHash}`);
    if (savedScroll !== null) {
      sessionStorage.removeItem(`scroll_pos_${currentHash}`);
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number(savedScroll), behavior: 'auto' });
      });
    }
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-20 w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16 space-y-8">
      
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-white/10">
        <div className="p-3 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20">
          <Heart className="w-6 h-6 fill-red-500" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Phim Yêu Thích Của Tôi</h1>
          <p className="text-xs text-slate-400 mt-0.5">Danh sách các bộ phim bạn đã đánh dấu để xem sau</p>
        </div>
      </div>

      {/* Favorites Grid */}
      {favorites.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {favorites.map((movie) => (
            <MovieCard key={movie.slug} movie={movie} onSelect={onSelectMovie} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-slate-500 space-y-3">
          <Film className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-base font-semibold text-slate-300">Chưa có bộ phim yêu thích nào</p>
          <p className="text-xs">Bấm biểu tượng trái tim ở góc poster để lưu phim vào danh sách này nhé!</p>
        </div>
      )}

    </div>
  );
};
