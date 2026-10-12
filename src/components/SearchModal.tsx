import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Loader2,
  Film,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Calendar,
  Globe,
  Tag,
  Layers,
} from 'lucide-react';
import {
  searchMovies,
  getMoviesByCategory,
  getMoviesByType,
  getMoviesByCountry,
  CATEGORIES,
  COUNTRIES,
} from '../services/api';
import type { MovieItem } from '../types/movie';
import { MovieCard } from './MovieCard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (slug: string) => void;
}

const YEARS = [
  '2026',
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018',
];

const MOVIE_TYPES = [
  { label: 'Tất cả loại', value: '' },
  { label: 'Phim Lẻ', value: 'single' },
  { label: 'Phim Bộ', value: 'series' },
  { label: 'Hoạt Hình', value: 'hoathinh' },
  { label: 'TV Shows', value: 'tvshows' },
];

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectMovie }) => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rawResults, setRawResults] = useState<MovieItem[]>([]);
  const [showFilters, setShowFilters] = useState(false); // Mặc định tìm trực tiếp, không choán chỗ

  // Filter States
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'year' | 'name'>('latest');

  const inputRef = useRef<HTMLInputElement>(null);
  const isSearchPushedRef = useRef(false);

  // Safe close that respects browser history on mobile
  const handleClose = (fromPopState = false) => {
    if (!fromPopState && isSearchPushedRef.current) {
      isSearchPushedRef.current = false;
      window.history.back();
    } else {
      isSearchPushedRef.current = false;
    }
    onClose();
  };

  // Mobile Back button handling: Pressing Back closes Search Modal
  useEffect(() => {
    if (isOpen) {
      if (!isSearchPushedRef.current) {
        window.history.pushState({ zenModal: 'searchModal' }, '');
        isSearchPushedRef.current = true;
      }
      setTimeout(() => inputRef.current?.focus(), 100);
      if (rawResults.length === 0 && !keyword) {
        loadDefaultList();
      }
    } else {
      isSearchPushedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (isOpen) {
        handleClose(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen]);

  // Keyboard shortcut Ctrl+K and ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) handleClose();
      }
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const loadDefaultList = async () => {
    setLoading(true);
    try {
      const data = await getMoviesByType('phim-le', 1);
      setRawResults(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search when keyword or category/type change
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (keyword.trim()) {
          // If keyword is provided, search via search API with high limit
          const data = await searchMovies(keyword.trim(), 100);
          setRawResults(data.items || []);
        } else if (selectedCategory) {
          // If no keyword, but category selected
          const data = await getMoviesByCategory(selectedCategory, 1);
          setRawResults(data.items || []);
        } else if (selectedCountry) {
          // If country selected
          const data = await getMoviesByCountry(selectedCountry, 1);
          setRawResults(data.items || []);
        } else if (selectedType) {
          // If type selected
          const data = await getMoviesByType(selectedType === 'single' ? 'phim-le' : selectedType === 'series' ? 'phim-bo' : selectedType === 'hoathinh' ? 'hoat-hinh' : 'tv-shows', 1);
          setRawResults(data.items || []);
        } else {
          // Default initial set
          const data = await getMoviesByType('phim-le', 1);
          setRawResults(data.items || []);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword, selectedCategory, selectedCountry, selectedType, isOpen]);

  // Apply in-memory client-side filters (Type, Year, Category, Country, Sort)
  const filteredResults = useMemo(() => {
    return rawResults
      .filter((item) => {
        // Filter by Type
        if (selectedType) {
          const itemType = item.type || '';
          if (selectedType === 'single' && !['single', 'phim-le'].includes(itemType)) return false;
          if (selectedType === 'series' && !['series', 'phim-bo'].includes(itemType)) return false;
          if (selectedType === 'hoathinh' && !['hoathinh', 'hoat-hinh'].includes(itemType)) return false;
          if (selectedType === 'tvshows' && !['tvshows', 'tv-shows'].includes(itemType)) return false;
        }

        // Filter by Year
        if (selectedYear) {
          if (item.year?.toString() !== selectedYear) return false;
        }

        // Filter by Category
        if (selectedCategory) {
          const hasCategory = item.category?.some(
            (c) => c.slug === selectedCategory || c.id === selectedCategory
          );
          if (!hasCategory) return false;
        }

        // Filter by Country
        if (selectedCountry) {
          const hasCountry = item.country?.some(
            (c) => c.slug === selectedCountry || c.id === selectedCountry
          );
          if (!hasCountry) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'year') {
          return (b.year || 0) - (a.year || 0);
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'vi');
        }
        return 0; // Default order
      });
  }, [rawResults, selectedType, selectedYear, selectedCategory, selectedCountry, sortBy]);

  const activeFilterCount =
    (selectedType ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedCountry ? 1 : 0) +
    (selectedYear ? 1 : 0);

  const resetFilters = () => {
    setSelectedType('');
    setSelectedCategory('');
    setSelectedCountry('');
    setSelectedYear('');
    setSortBy('latest');
  };

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    rawResults.forEach((item) => {
      if (item.year && item.year > 1990) {
        yearsSet.add(item.year.toString());
      }
    });
    const sorted = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
    return sorted.length > 0 ? sorted : YEARS;
  }, [rawResults]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-3 sm:px-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => handleClose()}
    >
      <div
        className="w-full max-w-5xl glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/10 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Input Bar */}
        <div className="relative flex items-center border-b border-white/10 pb-4 gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <Search className="w-5 h-5" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm kiếm phim trực tiếp... (gõ tên phim hoặc diễn viên)"
            className="w-full bg-transparent text-base sm:text-xl font-bold text-white placeholder:text-slate-500 outline-none"
          />

          {keyword && (
            <button
              onClick={() => setKeyword('')}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Xóa từ khóa"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Toggle Filter Bar (Tìm Chi Tiết lúc cần) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showFilters
                ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Lọc chi tiết theo năm, thể loại, quốc gia"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showFilters ? 'Ẩn Lọc' : 'Lọc Chi Tiết'}</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-red-600 text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Close Modal Button */}
          <button
            onClick={() => handleClose()}
            className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer transition-colors flex items-center justify-center"
            title="Đóng (Esc)"
            aria-label="Đóng tìm kiếm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar Section (Mặc định ẩn, chỉ mở khi cần lọc chi tiết) */}
        {showFilters && (
          <div className="py-4 border-b border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              
              {/* 1. Loại Phim */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-red-500" />
                  <span>Loại Phim</span>
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-[#121622] text-xs font-medium text-slate-200 rounded-xl px-2.5 py-2 border border-white/10 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  {MOVIE_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-slate-900 text-white">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Thể Loại */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-500" />
                  <span>Thể Loại</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-[#121622] text-xs font-medium text-slate-200 rounded-xl px-2.5 py-2 border border-white/10 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-white">Tất cả thể loại</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug} className="bg-slate-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Quốc Gia */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-blue-400" />
                  <span>Quốc Gia</span>
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-[#121622] text-xs font-medium text-slate-200 rounded-xl px-2.5 py-2 border border-white/10 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-white">Tất cả quốc gia</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.slug} value={c.slug} className="bg-slate-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Năm Phát Hành (Chỉ hiện các năm thực tế có phim) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>Năm Sản Xuất</span>
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#121622] text-xs font-medium text-slate-200 rounded-xl px-2.5 py-2 border border-white/10 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-white">Tất cả các năm</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y} className="bg-slate-900 text-white">
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Sắp Xếp */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Sắp Xếp</span>
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-[#121622] text-xs font-medium text-slate-200 rounded-xl px-2.5 py-2 border border-white/10 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  <option value="latest" className="bg-slate-900 text-white">Mới cập nhật</option>
                  <option value="year" className="bg-slate-900 text-white">Năm giảm dần</option>
                  <option value="name" className="bg-slate-900 text-white">Tên phim (A-Z)</option>
                </select>
              </div>

            </div>

            {/* Active Filter Pills Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedType && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-red-600/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-lg">
                    Loại: {MOVIE_TYPES.find((t) => t.value === selectedType)?.label}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedType('')} />
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                    Thể loại: {CATEGORIES.find((c) => c.slug === selectedCategory)?.name}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedCategory('')} />
                  </span>
                )}
                {selectedCountry && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-lg">
                    Quốc gia: {COUNTRIES.find((c) => c.slug === selectedCountry)?.name}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedCountry('')} />
                  </span>
                )}
                {selectedYear && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                    Năm: {selectedYear}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedYear('')} />
                  </span>
                )}
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors ml-auto cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa bộ lọc</span>
                </button>
              )}
            </div>

          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto py-5 pr-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <p className="text-sm font-semibold">Đang tìm kiếm & lọc phim...</p>
            </div>
          ) : filteredResults.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-slate-400">
                  Hiển thị <span className="text-red-400 font-bold">{filteredResults.length}</span> bộ phim phù hợp:
                </p>
                {activeFilterCount > 0 && (
                  <span className="text-[11px] text-slate-500">
                    (Đã áp dụng {activeFilterCount} tiêu chí lọc)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredResults.map((m) => (
                  <MovieCard
                    key={m.slug}
                    movie={m}
                    onSelect={(slug) => {
                      onSelectMovie(slug);
                      handleClose();
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <Film className="w-12 h-12 mx-auto opacity-30 text-red-500" />
              <p className="text-base font-semibold text-slate-300">
                Không tìm thấy phim phù hợp
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy thử kiểm tra lại chính tả từ khóa hoặc bấm "Xóa bộ lọc" nếu đang lọc.
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white mt-2 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa Tất Cả Bộ Lọc</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
