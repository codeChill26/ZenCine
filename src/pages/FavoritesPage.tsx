import React from 'react';
import { Heart, Film } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { MovieCard } from '../components/MovieCard';

interface FavoritesPageProps {
  onSelectMovie: (slug: string) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onSelectMovie }) => {
  const { favorites } = useFavorites();

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      
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
