import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { MovieItem } from '../types/movie';
import { MovieCard } from './MovieCard';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  movies: MovieItem[];
  icon?: React.ReactNode;
  onSelectMovie: (slug: string) => void;
  onViewMore?: () => void;
}

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  subtitle,
  movies,
  icon,
  onSelectMovie,
  onViewMore,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="my-10 relative">
      <div className="w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16">
        <div className="flex items-end justify-between mb-4">
          {/* Section Title with link capability */}
          <div
            onClick={onViewMore}
            className={`flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 ${
              onViewMore ? 'cursor-pointer group select-none' : ''
            }`}
          >
            {icon && (
              <div className="p-2 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide flex items-center gap-1.5 group-hover:text-red-400 transition-colors">
                <span className="truncate">{title}</span>
                {onViewMore && (
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                )}
              </h2>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          {/* Desktop Right Controls (Hidden on mobile where swiping is natural) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {onViewMore && (
              <button
                onClick={onViewMore}
                className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors mr-2 group cursor-pointer"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={rowRef}
          className="flex items-stretch gap-4 sm:gap-5 lg:gap-6 2xl:gap-7 overflow-x-auto no-scrollbar scroll-smooth py-3 px-1"
        >
          {movies.map((movie) => (
            <div key={movie.slug} className="w-[165px] sm:w-[200px] md:w-[235px] lg:w-[265px] xl:w-[285px] 2xl:w-[310px] flex-shrink-0">
              <MovieCard movie={movie} onSelect={onSelectMovie} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
