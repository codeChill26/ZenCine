import React, { useEffect, useState } from 'react';
import { Film, Tv, PlayCircle, Flame, Clock, Sparkles } from 'lucide-react';
import { getLatestMovies, getMoviesByType } from '../services/api';
import type { MovieItem } from '../types/movie';
import { HeroBanner } from '../components/HeroBanner';
import { MovieRow } from '../components/MovieRow';
import { QuickInfoModal } from '../components/QuickInfoModal';
import { useWatchHistory } from '../hooks/useWatchHistory';

interface HomePageProps {
  onSelectMovie: (slug: string) => void;
  onNavigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectMovie, onNavigate }) => {
  const [latestMovies, setLatestMovies] = useState<MovieItem[]>([]);
  const [singleMovies, setSingleMovies] = useState<MovieItem[]>([]);
  const [seriesMovies, setSeriesMovies] = useState<MovieItem[]>([]);
  const [animeMovies, setAnimeMovies] = useState<MovieItem[]>([]);
  const [selectedInfoMovie, setSelectedInfoMovie] = useState<MovieItem | null>(null);

  const { history } = useWatchHistory();

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [latestRes, singleRes, seriesRes, animeRes] = await Promise.all([
          getLatestMovies(1),
          getMoviesByType('phim-le', 1),
          getMoviesByType('phim-bo', 1),
          getMoviesByType('hoat-hinh', 1),
        ]);

        setLatestMovies(latestRes.items || []);
        setSingleMovies(singleRes.items || []);
        setSeriesMovies(seriesRes.items || []);
        setAnimeMovies(animeRes.items || []);
      } catch (err) {
        console.error('Lỗi tải dữ liệu trang chủ:', err);
      }
    }
    loadHomeData();
  }, []);

  // Restore scroll position when returning from movie watch page
  useEffect(() => {
    if (latestMovies.length > 0) {
      const currentHash = window.location.hash || '#/home';
      const savedScroll = sessionStorage.getItem(`scroll_pos_${currentHash}`);
      if (savedScroll !== null) {
        sessionStorage.removeItem(`scroll_pos_${currentHash}`);
        requestAnimationFrame(() => {
          window.scrollTo({ top: Number(savedScroll), behavior: 'auto' });
        });
      }
    }
  }, [latestMovies]);

  return (
    <div className="pb-16">
      {/* Hero Banner with Image 1 UI & Quick Info support */}
      <HeroBanner
        movies={latestMovies}
        onSelectMovie={onSelectMovie}
        onOpenInfo={(movie) => setSelectedInfoMovie(movie)}
      />

      {/* Continue Watching Row (if user has history) */}
      {history.length > 0 && (
        <section className="my-10 w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              <h2 className="text-xl sm:text-2xl font-black text-white">Tiếp Tục Xem</h2>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              Xem tất cả ({history.length})
            </button>
          </div>

          <div className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto no-scrollbar py-2">
            {history.slice(0, 6).map((item) => (
              <div
                key={item.slug}
                tabIndex={0}
                role="button"
                aria-label={`Tiếp tục xem ${item.name}`}
                onClick={() => onSelectMovie(item.slug)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.keyCode === 13 || e.key === ' ') {
                    e.preventDefault();
                    onSelectMovie(item.slug);
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className="w-[220px] sm:w-[260px] lg:w-[290px] xl:w-[320px] flex-shrink-0 glass-panel rounded-2xl overflow-hidden cursor-pointer group hover:border-red-500/50 transition-all hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/80 focus-visible:scale-105"
              >
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                  <img
                    src={item.thumb_url}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                    <div
                      className="h-full bg-red-600"
                      style={{
                        width: `${item.duration > 0 ? (item.currentTime / item.duration) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                  <p className="text-xs text-red-400 font-medium mt-1">Đang xem: {item.episodeName}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Phim Mới Cập Nhật */}
      <MovieRow
        title="Phim Mới Cập Nhật"
        subtitle="Tổng hợp các tác phẩm điện ảnh và truyền hình mới nhất"
        movies={latestMovies}
        icon={<Flame className="w-5 h-5 text-red-500" />}
        onSelectMovie={onSelectMovie}
        onViewMore={() => onNavigate('type:phim-le')}
      />

      {/* Phim Lẻ Đỉnh Cao */}
      <MovieRow
        title="Phim Lẻ Đỉnh Cao"
        subtitle="Bom tấn chiếu rạp, hành động kịch tính và hài hước hấp dẫn"
        movies={singleMovies}
        icon={<Film className="w-5 h-5 text-amber-500" />}
        onSelectMovie={onSelectMovie}
        onViewMore={() => onNavigate('type:phim-le')}
      />

      {/* Phim Bộ Nổi Bật */}
      <MovieRow
        title="Phim Bộ Nổi Bật"
        subtitle="Các series dài tập kinh điển từ Hàn Quốc, Trung Quốc và Âu Mỹ"
        movies={seriesMovies}
        icon={<Tv className="w-5 h-5 text-indigo-400" />}
        onSelectMovie={onSelectMovie}
        onViewMore={() => onNavigate('type:phim-bo')}
      />

      {/* Hoạt Hình & Anime */}
      <MovieRow
        title="Hoạt Hình & Anime"
        subtitle="Thế giới huyền huyễn 3D Trung Quốc và Anime Nhật Bản Full HD"
        movies={animeMovies}
        icon={<Sparkles className="w-5 h-5 text-pink-400" />}
        onSelectMovie={onSelectMovie}
        onViewMore={() => onNavigate('type:hoat-hinh')}
      />

      {/* Quick Info Modal */}
      <QuickInfoModal
        movie={selectedInfoMovie}
        onClose={() => setSelectedInfoMovie(null)}
        onPlay={onSelectMovie}
      />
    </div>
  );
};
