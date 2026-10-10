import React, { useState } from 'react';
import { Play, Star, Film } from 'lucide-react';
import type { MovieItem } from '../types/movie';
import { getImageUrl, getMovieRating, getEpisodeBadge, getLangBadge } from '../services/api';

interface MovieCardProps {
  movie: MovieItem;
  onSelect: (slug: string) => void;
  className?: string;
}

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80';

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelect, className = '' }) => {
  const initialImage = getImageUrl(movie.poster_url || movie.thumb_url);
  const secondaryImage = getImageUrl(movie.thumb_url || movie.poster_url);

  const [imgSrc, setImgSrc] = useState(initialImage);
  const [hasError, setHasError] = useState(false);

  const handleImageError = () => {
    if (imgSrc !== secondaryImage && secondaryImage) {
      setImgSrc(secondaryImage);
    } else {
      setHasError(true);
      setImgSrc(FALLBACK_POSTER);
    }
  };

  const rating = getMovieRating(movie);
  const episode = getEpisodeBadge(movie);
  const lang = getLangBadge(movie);

  return (
    <div
      className={`group relative flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1.5 ${className}`}
      onClick={() => onSelect(movie.slug)}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 border border-white/5 group-hover:border-red-500/40 shadow-lg group-hover:shadow-red-600/20 transition-all">
        {!hasError ? (
          <img
            src={imgSrc}
            alt={movie.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-slate-800 to-slate-950">
            <Film className="w-10 h-10 text-red-500/40 mb-2" />
            <span className="text-xs font-bold text-slate-300 line-clamp-3">{movie.name}</span>
          </div>
        )}

        {/* Top Badges (Exact match with Image 2: Blue Vietsub on left, Dark Episode on right) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          {/* Blue Vietsub Badge */}
          <span className="bg-[#0066ff] text-white font-bold text-[11px] px-2 py-0.5 rounded-md shadow-md">
            {lang}
          </span>

          {/* Dark Translucent Episode Badge */}
          <span className="bg-black/80 backdrop-blur-md text-white font-bold text-[11px] px-2.5 py-0.5 rounded-md border border-white/10 shadow-md">
            {episode}
          </span>
        </div>

        {/* Center Hover Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50 group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Block (Exact match with Image 2) */}
      <div className="pt-2.5 px-0.5 space-y-1">
        {/* Red Movie Title */}
        <h3
          className="text-sm font-bold text-red-600 truncate group-hover:text-red-500 transition-colors"
          title={movie.name}
        >
          {movie.name}
        </h3>

        {/* Origin / English Subtitle in Muted Gray */}
        <p
          className="text-xs text-slate-400 truncate"
          title={movie.origin_name || movie.name}
        >
          {movie.origin_name || movie.name}
        </p>

        {/* Bottom Rating (⭐ 9.5) and Year (2021) */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <div className="flex items-center gap-1 font-bold text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{rating}</span>
          </div>

          <span className="text-slate-400 font-medium">
            {movie.year || '2024'}
          </span>
        </div>
      </div>
    </div>
  );
};
