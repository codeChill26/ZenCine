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
  User,
  Clapperboard,
  Star,
} from 'lucide-react';
import {
  searchMovies,
  getMoviesByCategory,
  getMoviesByType,
  getMoviesByCountry,
  CATEGORIES,
  COUNTRIES,
} from '../services/api';
import {
  searchMoviesByPerson,
  POPULAR_ACTORS,
  POPULAR_DIRECTORS,
  type PersonProfile,
} from '../services/tmdb';
import type { MovieItem } from '../types/movie';
import { MovieCard } from './MovieCard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (slug: string) => void;
  initialKeyword?: string;
  initialScope?: 'all' | 'actor' | 'director' | 'movie';
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

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMovie,
  initialKeyword = '',
  initialScope = 'all',
}) => {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [searchScope, setSearchScope] = useState<'all' | 'actor' | 'director' | 'movie'>(initialScope);
  const [detectedPerson, setDetectedPerson] = useState<PersonProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawResults, setRawResults] = useState<MovieItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filter States
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'year' | 'name'>('latest');

  const inputRef = useRef<HTMLInputElement>(null);
  const isSearchPushedRef = useRef(false);

  // Sync initialKeyword and initialScope when opening modal
  useEffect(() => {
    if (isOpen) {
      if (initialKeyword) {
        setKeyword(initialKeyword);
      }
      if (initialScope) {
        setSearchScope(initialScope);
      }
    }
  }, [isOpen, initialKeyword, initialScope]);

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

  // Debounced search supporting Actor, Director, Movie Title & Unified mode
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const trimmed = keyword.trim();

        if (trimmed) {
          if (searchScope === 'actor') {
            // Dedicated Actor Search
            const { person, movies } = await searchMoviesByPerson(trimmed, 'actor');
            setDetectedPerson(person);
            setRawResults(movies);
          } else if (searchScope === 'director') {
            // Dedicated Director Search
            const { person, movies } = await searchMoviesByPerson(trimmed, 'director');
            setDetectedPerson(person);
            setRawResults(movies);
          } else if (searchScope === 'movie') {
            // Strict Movie Title Search
            setDetectedPerson(null);
            const data = await searchMovies(trimmed, 100);
            setRawResults(data.items || []);
          } else {
            // Unified 'all' mode:
            // Searches KKPhim movie titles and checks if keyword is an actor or director in parallel
            const [titleRes, personRes] = await Promise.all([
              searchMovies(trimmed, 60).catch(() => ({ items: [] as MovieItem[] })),
              searchMoviesByPerson(trimmed, 'all').catch(() => ({ person: null, movies: [] as MovieItem[] })),
            ]);

            const titleMovies = titleRes.items || [];
            const personMovies = personRes.movies || [];

            setDetectedPerson(personRes.person);

            // Merge person's movies with title search results without duplicates
            const combined: MovieItem[] = [];
            const seen = new Set<string>();

            // If query matched a person and has few or zero direct title matches (e.g. 'Châu Tinh Trì'), prioritize person's movies!
            if (personMovies.length > 0 && titleMovies.length <= 4) {
              for (const m of personMovies) {
                if (!seen.has(m.slug)) {
                  seen.add(m.slug);
                  combined.push(m);
                }
              }
              for (const m of titleMovies) {
                if (!seen.has(m.slug)) {
                  seen.add(m.slug);
                  combined.push(m);
                }
              }
            } else {
              for (const m of titleMovies) {
                if (!seen.has(m.slug)) {
                  seen.add(m.slug);
                  combined.push(m);
                }
              }
              for (const m of personMovies) {
                if (!seen.has(m.slug)) {
                  seen.add(m.slug);
                  combined.push(m);
                }
              }
            }
            setRawResults(combined);
          }
        } else if (selectedCategory) {
          setDetectedPerson(null);
          const data = await getMoviesByCategory(selectedCategory, 1);
          setRawResults(data.items || []);
        } else if (selectedCountry) {
          setDetectedPerson(null);
          const data = await getMoviesByCountry(selectedCountry, 1);
          setRawResults(data.items || []);
        } else if (selectedType) {
          setDetectedPerson(null);
          const data = await getMoviesByType(
            selectedType === 'single'
              ? 'phim-le'
              : selectedType === 'series'
              ? 'phim-bo'
              : selectedType === 'hoathinh'
              ? 'hoat-hinh'
              : 'tv-shows',
            1
          );
          setRawResults(data.items || []);
        } else {
          setDetectedPerson(null);
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
  }, [keyword, searchScope, selectedCategory, selectedCountry, selectedType, isOpen]);

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
            placeholder={
              searchScope === 'actor'
                ? 'Nhập tên diễn viên... (vd: Châu Tinh Trì, Thành Long, Tom Cruise)'
                : searchScope === 'director'
                ? 'Nhập tên đạo diễn... (vd: Christopher Nolan, Lý Hải, James Cameron)'
                : searchScope === 'movie'
                ? 'Nhập tên phim cần tìm... (vd: Mai, Lật Mặt, Kẻ Đánh Cắp Giấc Mơ)'
                : 'Tìm phim, diễn viên hoặc đạo diễn... (vd: Châu Tinh Trì, Nolan, Mai)'
            }
            className="w-full bg-transparent text-base sm:text-xl font-bold text-white placeholder:text-slate-500 outline-none"
          />

          {keyword && (
            <button
              onClick={() => {
                setKeyword('');
                setDetectedPerson(null);
              }}
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

        {/* Search Scope Switcher: Tất Cả | Diễn Viên | Đạo Diễn | Tên Phim */}
        <div className="flex items-center gap-1.5 pt-3 pb-2 overflow-x-auto no-scrollbar border-b border-white/5">
          <button
            onClick={() => setSearchScope('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              searchScope === 'all'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tất Cả</span>
          </button>

          <button
            onClick={() => setSearchScope('actor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              searchScope === 'actor'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <User className="w-3.5 h-3.5 text-red-400" />
            <span>Diễn Viên</span>
          </button>

          <button
            onClick={() => setSearchScope('director')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              searchScope === 'director'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
            <span>Đạo Diễn</span>
          </button>

          <button
            onClick={() => setSearchScope('movie')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              searchScope === 'movie'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-blue-400" />
            <span>Tên Phim</span>
          </button>
        </div>

        {/* Quick Suggestion Chips for Popular Actors / Directors */}
        {!keyword && (
          <div className="py-2.5 space-y-2 border-b border-white/5 animate-in fade-in duration-150">
            {searchScope !== 'director' && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>Diễn viên hot:</span>
                </span>
                {POPULAR_ACTORS.map((act) => (
                  <button
                    key={act}
                    onClick={() => {
                      setKeyword(act);
                      setSearchScope('actor');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-600/20 hover:text-red-400 text-slate-300 border border-white/10 hover:border-red-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {act}
                  </button>
                ))}
              </div>
            )}

            {searchScope !== 'actor' && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                  <Clapperboard className="w-3 h-3 text-amber-400" />
                  <span>Đạo diễn tiêu biểu:</span>
                </span>
                {POPULAR_DIRECTORS.map((dir) => (
                  <button
                    key={dir}
                    onClick={() => {
                      setKeyword(dir);
                      setSearchScope('director');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 border border-white/10 hover:border-amber-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {dir}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
                  <Tag className="w-3 h-3 text-red-500" />
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
                  <Globe className="w-3 h-3 text-red-500" />
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

              {/* 4. Năm Phát Hành */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-red-500" />
                  <span>Năm Phát Hành</span>
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#121622] text-xs font-medium text-slate-200 rounded-xl px-2.5 py-2 border border-white/10 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-white">Tất cả các năm</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year} className="bg-slate-900 text-white">
                      Năm {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Sắp Xếp */}
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-red-500" />
                  <span>Sắp Xếp</span>
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-[#121622] text-xs font-medium text-slate-200 rounded-xl px-2.5 py-2 border border-white/10 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  <option value="latest" className="bg-slate-900 text-white">Mới cập nhật</option>
                  <option value="year" className="bg-slate-900 text-white">Năm mới nhất</option>
                  <option value="name" className="bg-slate-900 text-white">Tên phim (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Badges of Active Filters */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-xs text-slate-400">Đang lọc:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedType && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-lg">
                    {MOVIE_TYPES.find((t) => t.value === selectedType)?.label}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedType('')} />
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                    {CATEGORIES.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedCategory('')} />
                  </span>
                )}
                {selectedCountry && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-lg">
                    {COUNTRIES.find((c) => c.slug === selectedCountry)?.name || selectedCountry}
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
              <p className="text-sm font-semibold">Đang tìm kiếm phim, diễn viên & đạo diễn...</p>
            </div>
          ) : (
            <div>
              {/* Person Profile Banner (When an Actor or Director is detected) */}
              {detectedPerson && (
                <div className="mb-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#161c2a] to-[#121622] border border-red-500/30 flex items-center gap-4 shadow-xl">
                  {detectedPerson.profilePath ? (
                    <img
                      src={detectedPerson.profilePath}
                      alt={detectedPerson.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-red-500/50 shadow-md flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-600/30 text-red-400 flex items-center justify-center font-black text-xl border border-red-500/40 flex-shrink-0">
                      {detectedPerson.name.charAt(0)}
                    </div>
                  )}

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-xl font-black text-white truncate">
                        {detectedPerson.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600/30 text-red-300 border border-red-500/40">
                        {searchScope === 'director' || detectedPerson.department === 'Directing'
                          ? '🎥 Đạo Diễn'
                          : '⭐ Diễn Viên'}
                      </span>
                      {detectedPerson.originalName && detectedPerson.originalName !== detectedPerson.name && (
                        <span className="text-xs text-slate-400 truncate">
                          ({detectedPerson.originalName})
                        </span>
                      )}
                    </div>

                    {detectedPerson.knownFor && detectedPerson.knownFor.length > 0 && (
                      <p className="text-xs text-slate-400 truncate">
                        Tác phẩm tiêu biểu: <strong className="text-slate-200">{detectedPerson.knownFor.slice(0, 4).join(' • ')}</strong>
                      </p>
                    )}

                    <p className="text-[11px] text-red-400/90 font-medium">
                      Tuyển tập phim có sự tham gia của {detectedPerson.name} trên ZenCine:
                    </p>
                  </div>
                </div>
              )}

              {filteredResults.length > 0 ? (
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
                    {detectedPerson
                      ? `Hiện tại các tác phẩm của ${detectedPerson.name} đang được cập nhật thêm. Bạn có thể thử tìm tên phim khác.`
                      : 'Hãy thử kiểm tra lại chính tả hoặc chuyển sang tab Diễn Viên / Đạo Diễn.'}
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
          )}
        </div>
      </div>
    </div>
  );
};
