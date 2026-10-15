import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Film, Star, Clock, Calendar, ArrowUpDown, X } from 'lucide-react';
import {
  getMoviesByType,
  getMoviesByCategory,
  getMoviesByCountry,
  getMovieRating,
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
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'newest' | 'oldest'>('default');
  const [jumpPageInput, setJumpPageInput] = useState('');

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
          setTotalItems(res.pagination.totalItems || 0);
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

  // Sort Movies: Sao cao | Mới --> Cũ | Cũ --> Mới | Mặc định
  const sortedMovies = useMemo(() => {
    if (sortBy === 'rating') {
      return [...movies].sort((a, b) => Number(getMovieRating(b)) - Number(getMovieRating(a)));
    }
    if (sortBy === 'newest') {
      return [...movies].sort((a, b) => (b.year || 0) - (a.year || 0));
    }
    if (sortBy === 'oldest') {
      return [...movies].sort((a, b) => (a.year || 9999) - (b.year || 9999));
    }
    return movies;
  }, [movies, sortBy]);

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

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      handlePageChange(target);
      setJumpPageInput('');
    }
  };

  const renderPagination = (isTop = false) => {
    if (totalPages <= 1) return null;

    return (
      <div
        className={`flex items-center justify-between flex-wrap gap-3 ${
          isTop
            ? 'bg-[#10141e]/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-lg'
            : 'pt-10 pb-4 justify-center sm:justify-between'
        }`}
      >
        {/* Left: Current Page Info */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-slate-400">
            Trang <span className="text-red-400 font-bold">{page}</span> / {totalPages.toLocaleString('vi-VN')}
          </span>
        </div>

        {/* Center: Numeric Pages with Previous & Next */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
          {/* Previous Page Button */}
          <button
            disabled={page <= 1}
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            className="flex items-center gap-1 px-3 py-1.5 sm:py-2 rounded-xl glass-panel text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Trước</span>
          </button>

          {/* Page Numbers: 1, 2, 3, 4, 5 ... totalPages */}
          {paginationItems.map((item, index) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${isTop ? 'top' : 'bot'}-${index}`}
                  className="px-1.5 sm:px-2 py-1 text-xs font-bold text-slate-500 select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = item as number;
            const isActive = pageNum === page;

            return (
              <button
                key={`page-${isTop ? 'top' : 'bot'}-${pageNum}`}
                onClick={() => handlePageChange(pageNum)}
                className={`min-w-[34px] sm:min-w-[38px] h-8 sm:h-9 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105 ring-1 ring-red-400 font-extrabold'
                    : 'glass-panel text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title={`Chuyển đến trang ${pageNum}`}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Next Page Button */}
          <button
            disabled={page >= totalPages}
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            className="flex items-center gap-1 px-3 py-1.5 sm:py-2 rounded-xl glass-panel text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title="Trang sau"
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Quick Jump Form */}
        <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 hidden lg:inline">Nhảy đến:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            placeholder={`1-${totalPages}`}
            className="w-16 sm:w-20 px-2.5 py-1.5 rounded-xl bg-[#141824] border border-white/15 text-white text-xs font-semibold text-center focus:border-red-500 focus:outline-none placeholder:text-slate-500"
            title={`Nhập số trang từ 1 đến ${totalPages}`}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm shadow-red-600/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Đi
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-28 pb-20 w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16 space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-5 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wide">
              {title}
            </h1>

            {/* Phân trang mini phía trên: vd: < 2/56 > */}
            {totalPages > 1 && (
              <div className="inline-flex items-center gap-1 bg-[#141824] px-2.5 py-1 rounded-xl border border-white/10 text-xs font-bold shadow-inner">
                <button
                  disabled={page <= 1}
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-1 text-slate-300 select-none">
                  <span className="text-red-500 font-extrabold">{page}</span>/{totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-400">
            Tổng cộng <span className="text-red-400 font-bold">{totalItems > 0 ? totalItems.toLocaleString('vi-VN') : sortedMovies.length}</span> bộ phim • Trang <span className="text-white font-semibold">{page}</span> / {totalPages}
          </p>
        </div>

        {/* Primary Type Switcher (Luôn chuyển đến danh mục thuần túy hiển thị hết thể loại) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onNavigate('type:phim-le')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              filterType === 'type' && slug === 'phim-le'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'glass-panel text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Phim Lẻ
          </button>
          <button
            onClick={() => onNavigate('type:phim-bo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              filterType === 'type' && slug === 'phim-bo'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'glass-panel text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Phim Bộ
          </button>
          <button
            onClick={() => onNavigate('type:hoat-hinh')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              filterType === 'type' && slug === 'hoat-hinh'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'glass-panel text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Hoạt Hình
          </button>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 py-1">
        {/* Sort Options: Sao cao | Mới --> Cũ | Cũ --> Mới */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
            <span>Sắp xếp:</span>
          </span>

          <button
            onClick={() => setSortBy('default')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              sortBy === 'default'
                ? 'bg-red-600/20 text-red-400 border border-red-500/30 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-transparent'
            }`}
          >
            Mặc định
          </button>

          <button
            onClick={() => setSortBy('rating')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              sortBy === 'rating'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-transparent'
            }`}
            title="Sắp xếp phim có điểm đánh giá sao cao nhất"
          >
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>Sao cao</span>
          </button>

          <button
            onClick={() => setSortBy('newest')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              sortBy === 'newest'
                ? 'bg-red-600/20 text-red-400 border border-red-500/30 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-transparent'
            }`}
            title="Sắp xếp theo năm sản xuất mới nhất"
          >
            <Clock className="w-3 h-3 text-red-400" />
            <span>Mới → Cũ</span>
          </button>

          <button
            onClick={() => setSortBy('oldest')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              sortBy === 'oldest'
                ? 'bg-red-600/20 text-red-400 border border-red-500/30 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-transparent'
            }`}
            title="Sắp xếp theo năm sản xuất cũ hơn"
          >
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Cũ → Mới</span>
          </button>
        </div>

        {/* Quick Category and Country selector directly in page */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType === 'category' ? slug : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onNavigate(filterType === 'type' ? `type:${slug}` : 'type:phim-bo');
              } else {
                onNavigate(`category:${val}`);
              }
            }}
            className="bg-[#141824] text-xs font-semibold text-slate-300 rounded-xl px-3 py-1.5 border border-white/10 hover:border-white/20 focus:border-red-500 outline-none cursor-pointer"
            title="Chọn thể loại phim"
          >
            <option value="" className="bg-slate-900 text-white">✨ Tất Cả Thể Loại</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-slate-900 text-white">
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterType === 'country' ? slug : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onNavigate(filterType === 'type' ? `type:${slug}` : 'type:phim-le');
              } else {
                onNavigate(`country:${val}`);
              }
            }}
            className="bg-[#141824] text-xs font-semibold text-slate-300 rounded-xl px-3 py-1.5 border border-white/10 hover:border-white/20 focus:border-blue-500 outline-none cursor-pointer"
            title="Chọn quốc gia"
          >
            <option value="" className="bg-slate-900 text-white">✨ Tất Cả Quốc Gia</option>
            {COUNTRIES.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-slate-900 text-white">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category reset / all categories helper badge */}
        {filterType === 'category' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">
              Đang lọc: <strong className="text-white">{CATEGORIES.find((c) => c.slug === slug)?.name || slug}</strong>
            </span>
            <button
              onClick={() => onNavigate('type:phim-bo')}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 font-semibold cursor-pointer transition-colors"
              title="Hiện tất cả các thể loại của Phim Bộ"
            >
              <span>Xem tất cả Phim Bộ</span>
              <X className="w-3 h-3" />
            </button>
            <button
              onClick={() => onNavigate('type:phim-le')}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-semibold cursor-pointer transition-colors"
              title="Hiện tất cả các thể loại của Phim Lẻ"
            >
              <span>Xem tất cả Phim Lẻ</span>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Top Pagination Controls */}
      {renderPagination(true)}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Đang nạp danh sách phim...</p>
        </div>
      ) : sortedMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 lg:gap-6">
          {sortedMovies.map((m) => (
            <MovieCard key={m.slug} movie={m} onSelect={onSelectMovie} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-slate-500">
          <Film className="w-12 h-12 mx-auto mb-3 opacity-30 text-red-500" />
          <p className="text-base font-semibold text-slate-300">Không tìm thấy phim trong mục này</p>
        </div>
      )}

      {/* Bottom Pagination Controls */}
      {renderPagination(false)}
    </div>
  );
};
