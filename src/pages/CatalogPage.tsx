import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Film } from 'lucide-react';
import {
  getMoviesByType,
  getMoviesByCategory,
  getMoviesByCountry,
  CATEGORIES,
  COUNTRIES,
} from '../services/api';
import type { MovieItem } from '../types/movie';
import { MovieCard } from '../components/MovieCard';

interface CatalogPageProps {
  filterType: 'type' | 'category' | 'country';
  slug: string;
  initialPage?: number;
  onSelectMovie: (slug: string) => void;
  onNavigate: (route: string) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  filterType,
  slug,
  initialPage = 1,
  onSelectMovie,
  onNavigate,
}) => {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Sync internal page state if initialPage changes (from browser back/forward)
  useEffect(() => {
    if (initialPage && initialPage !== page) {
      setPage(initialPage);
    }
  }, [initialPage]);

  let title = 'Danh Sách Phim';
  if (filterType === 'type') {
    if (slug === 'phim-le') title = 'Phim Lẻ Đỉnh Cao';
    else if (slug === 'phim-bo') title = 'Phim Bộ Mới Nhất';
    else if (slug === 'hoat-hinh') title = 'Hoạt Hình & Anime';
    else if (slug === 'tv-shows') title = 'Chương Trình TV Shows';
  } else if (filterType === 'category') {
    const cat = CATEGORIES.find((c) => c.slug === slug);
    title = cat ? `Thể Loại: ${cat.name}` : `Thể Loại: ${slug}`;
  } else if (filterType === 'country') {
    const country = COUNTRIES.find((c) => c.slug === slug);
    title = country ? `Quốc Gia: ${country.name}` : `Quốc Gia: ${slug}`;
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let res;
        if (filterType === 'type') {
          res = await getMoviesByType(slug, page);
        } else if (filterType === 'category') {
          res = await getMoviesByCategory(slug, page);
        } else {
          res = await getMoviesByCountry(slug, page);
        }
        setMovies(res.items || []);
        if (res.pagination) {
          setTotalPages(Math.max(1, res.pagination.totalPages || 10));
        }
      } catch (err) {
        console.error('Lỗi tải danh mục:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Only scroll to top if there is no saved scroll position waiting to be restored
    const currentHash = window.location.hash;
    const hasSavedScroll = sessionStorage.getItem(`scroll_pos_${currentHash}`) !== null;
    if (!hasSavedScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [filterType, slug, page]);

  // Restore scroll position after movies finish loading when returning back
  useEffect(() => {
    if (!loading && movies.length > 0) {
      const currentHash = window.location.hash;
      const savedScroll = sessionStorage.getItem(`scroll_pos_${currentHash}`);
      if (savedScroll !== null) {
        sessionStorage.removeItem(`scroll_pos_${currentHash}`);
        requestAnimationFrame(() => {
          window.scrollTo({ top: Number(savedScroll), behavior: 'auto' });
        });
      }
    }
  }, [loading, movies]);

  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1 || (totalPages > 1 && newPage > totalPages)) return;
    setPage(newPage);
    const targetRoute = newPage === 1
      ? `${filterType}:${slug}`
      : `${filterType}:${slug}?page=${newPage}`;
    onNavigate(targetRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to generate pagination buttons: e.g. [1, 2, 3, 4, '...', 20]
  const getPaginationItems = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const paginationItems = getPaginationItems(page, totalPages);

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wide">
            {title}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Trang {page} / {totalPages}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onNavigate('type:phim-le')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              slug === 'phim-le' ? 'bg-red-600 text-white' : 'glass-panel text-slate-300 hover:text-white'
            }`}
          >
            Phim Lẻ
          </button>
          <button
            onClick={() => onNavigate('type:phim-bo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              slug === 'phim-bo' ? 'bg-red-600 text-white' : 'glass-panel text-slate-300 hover:text-white'
            }`}
          >
            Phim Bộ
          </button>
          <button
            onClick={() => onNavigate('type:hoat-hinh')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              slug === 'hoat-hinh' ? 'bg-red-600 text-white' : 'glass-panel text-slate-300 hover:text-white'
            }`}
          >
            Hoạt Hình
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Đang nạp danh sách phim...</p>
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((m) => (
            <MovieCard key={m.slug} movie={m} onSelect={onSelectMovie} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-slate-500">
          <Film className="w-12 h-12 mx-auto mb-3 opacity-30 text-red-500" />
          <p className="text-base font-semibold text-slate-300">Không tìm thấy phim trong mục này</p>
        </div>
      )}

      {/* Smart Numeric Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-10 flex-wrap">
          {/* Previous Page */}
          <button
            disabled={page <= 1}
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            className="flex items-center gap-1 px-3 py-2 rounded-xl glass-panel text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-all cursor-pointer mr-1"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Trước</span>
          </button>

          {/* Page Numbers: 1, 2, 3 ... N */}
          {paginationItems.map((item, index) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-2 text-xs font-bold text-slate-500 select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = item as number;
            const isActive = pageNum === page;

            return (
              <button
                key={`page-${pageNum}`}
                onClick={() => handlePageChange(pageNum)}
                className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105'
                    : 'glass-panel text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            disabled={page >= totalPages}
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            className="flex items-center gap-1 px-3 py-2 rounded-xl glass-panel text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-all cursor-pointer ml-1"
            title="Trang sau"
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
