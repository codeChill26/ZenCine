import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MovieItem } from '../types/movie';
import { getImageUrl, getEpisodeBadge } from '../services/api';

interface HeroBannerProps {
  movies: MovieItem[];
  onSelectMovie: (slug: string) => void;
  onOpenInfo?: (movie: MovieItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movies,
  onSelectMovie,
  onOpenInfo,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  const maxSlides = Math.min(movies.length, 6);

  const handleNext = () => {
    if (maxSlides <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % maxSlides);
  };

  const handlePrev = () => {
    if (maxSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + maxSlides) % maxSlides);
  };

  useEffect(() => {
    if (maxSlides <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % maxSlides);
    }, 7000);
    return () => clearInterval(interval);
  }, [currentIndex, maxSlides]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      touchEndXRef.current = e.touches[0].clientX;
      touchEndYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      touchEndXRef.current = e.touches[0].clientX;
      touchEndYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;

    const finalEndX = (e.changedTouches && e.changedTouches[0])
      ? e.changedTouches[0].clientX
      : (touchEndXRef.current ?? touchStartXRef.current ?? 0);

    const finalEndY = (e.changedTouches && e.changedTouches[0])
      ? e.changedTouches[0].clientY
      : (touchEndYRef.current ?? touchStartYRef.current ?? 0);

    const diffX = touchStartXRef.current - finalEndX;
    const diffY = (touchStartYRef.current || 0) - finalEndY;

    // Ignore horizontal gesture if vertical scroll was dominant
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    const minSwipeDistance = 35;
    if (diffX > minSwipeDistance) {
      // Swiped left -> Next slide
      handleNext();
    } else if (diffX < -minSwipeDistance) {
      // Swiped right -> Previous slide
      handlePrev();
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;
  };

  if (!movies || movies.length === 0) return null;

  const currentMovie = movies[currentIndex] || movies[0];
  const backdrop = getImageUrl(currentMovie.thumb_url || currentMovie.poster_url);
  const episode = getEpisodeBadge(currentMovie);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[65vh] sm:h-[75vh] min-h-[480px] max-h-[750px] overflow-hidden bg-black select-none touch-pan-y"
    >
      {/* Background Backdrop Image */}
      <div className="absolute inset-0">
        <img
          key={currentMovie.slug}
          src={backdrop}
          alt={currentMovie.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 animate-in fade-in duration-1000"
        />
        {/* Subtle Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/30 to-transparent" />
      </div>

      {/* Content Container (Exact match with Image 1) */}
      <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 flex flex-col justify-center">
        <div className="max-w-2xl space-y-4">
          
          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
            {currentMovie.name}
          </h1>

          {/* Sub-row 1: Year, Red FHD badge, Episode count */}
          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold flex-wrap">
            {currentMovie.year && (
              <span className="text-slate-300 font-medium">
                {currentMovie.year}
              </span>
            )}

            {/* Red FHD Badge */}
            <span className="bg-red-600 text-white font-bold text-[11px] px-2 py-0.5 rounded shadow-md uppercase">
              {currentMovie.quality || 'FHD'}
            </span>

            {/* Episode Current (e.g. Tập 22) */}
            <span className="text-slate-200 font-semibold">
              {episode}
            </span>
          </div>

          {/* Subtitle / English Name */}
          {currentMovie.origin_name && (
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              {currentMovie.origin_name}
            </p>
          )}

          {/* Sub-row 2: Category Pill Tags (Exact match with Image 1: Chính Kịch, Cổ Trang, Tâm Lý) */}
          {currentMovie.category && currentMovie.category.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {currentMovie.category.slice(0, 4).map((cat) => (
                <span
                  key={cat.id || cat.slug}
                  className="text-xs bg-[#181d29]/80 border border-white/10 text-slate-300 px-3.5 py-1 rounded-full font-medium shadow-sm"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* Sub-row 3: Action Buttons (Exact match with Image 1: Red 'Xem ngay' & Dark 'Thông tin') */}
          <div className="flex items-center gap-3 pt-3">
            {/* Red Xem Ngay Button */}
            <button
              onClick={() => onSelectMovie(currentMovie.slug)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Xem ngay</span>
            </button>

            {/* Dark Thông Tin Button */}
            <button
              onClick={() => onOpenInfo ? onOpenInfo(currentMovie) : onSelectMovie(currentMovie.slug)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1e293b]/90 hover:bg-[#334155] border border-white/10 text-white font-semibold text-sm transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md"
            >
              <Info className="w-4 h-4 text-slate-300" />
              <span>Thông tin</span>
            </button>
          </div>

        </div>
      </div>

      {/* Side Slider Navigation Arrows (Hidden on mobile, visible from sm up) */}
      <button
        onClick={handlePrev}
        className="hidden sm:flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white hover:scale-110 transition-all cursor-pointer z-20"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={handleNext}
        className="hidden sm:flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white hover:scale-110 transition-all cursor-pointer z-20"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Pagination Indicators at Bottom (Dots + Active Red Bar) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {movies.slice(0, 6).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all duration-300 cursor-pointer ${
              currentIndex === idx
                ? 'w-8 h-1.5 rounded-full bg-red-600 shadow-sm shadow-red-600'
                : 'w-2 h-2 rounded-full bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
