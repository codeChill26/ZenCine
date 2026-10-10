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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          className="flex items-stretch gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2"
        >
          {movies.map((movie) => (
            <div key={movie.slug} className="w-[160px] sm:w-[190px] md:w-[210px] flex-shrink-0">
              <MovieCard movie={movie} onSelect={onSelectMovie} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
