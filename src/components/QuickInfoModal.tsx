import React, { useEffect, useState, useRef } from 'react';
import { X, Play, Calendar, Star, Loader2 } from 'lucide-react';
import { getMovieDetail, getImageUrl, getMovieRating } from '../services/api';
import type { MovieItem, MovieDetail } from '../types/movie';

interface QuickInfoModalProps {
  movie: MovieItem | null;
  onClose: () => void;
  onPlay: (slug: string) => void;
}

export const QuickInfoModal: React.FC<QuickInfoModalProps> = ({ movie, onClose, onPlay }) => {
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const isInfoPushedRef = useRef(false);

  const handleClose = (fromPopState = false) => {
    if (!fromPopState && isInfoPushedRef.current) {
      isInfoPushedRef.current = false;
      window.history.back();
    } else {
      isInfoPushedRef.current = false;
    }
    onClose();
  };

  // Back button handling on mobile phones
  useEffect(() => {
    if (movie) {
      if (!isInfoPushedRef.current) {
        window.history.pushState({ zenModal: 'quickInfo' }, '');
        isInfoPushedRef.current = true;
      }
    } else {
      isInfoPushedRef.current = false;
    }
  }, [movie]);

  useEffect(() => {
    const handlePopState = () => {
      if (movie) {
        handleClose(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [movie]);

  useEffect(() => {
    if (!movie) {
      setDetail(null);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const res = await getMovieDetail(movie!.slug);
        if (res.movie) {
          setDetail(res.movie);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [movie]);

  if (!movie) return null;

  const currentMovie = detail || movie;
  const backdrop = getImageUrl(currentMovie.thumb_url || currentMovie.poster_url);
  const rating = getMovieRating(currentMovie);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => handleClose()}
    >
      <div
        className="relative w-full max-w-2xl glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop Banner Header */}
        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex-shrink-0">
          <img
            src={backdrop}
            alt={currentMovie.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121520] via-[#121520]/40 to-transparent" />

          {/* Close Button */}
          <button
            onClick={() => handleClose()}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black text-white backdrop-blur-md cursor-pointer transition-all"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title on Backdrop */}
          <div className="absolute bottom-4 left-6 right-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
              {currentMovie.name}
            </h2>
            {currentMovie.origin_name && (
              <p className="text-xs sm:text-sm text-slate-300 font-semibold mt-0.5">
                {currentMovie.origin_name}
              </p>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Metadata badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{rating}</span>
            </span>

            {currentMovie.quality && (
              <span className="bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-sm">
                {currentMovie.quality}
              </span>
            )}

            {currentMovie.episode_current && (
              <span className="bg-white/10 text-white font-semibold text-xs px-2.5 py-1 rounded-lg">
                {currentMovie.episode_current}
              </span>
            )}

            {currentMovie.year && (
              <span className="bg-white/10 text-slate-300 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {currentMovie.year}
              </span>
            )}
          </div>

          {/* Categories */}
          {currentMovie.category && currentMovie.category.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold mr-1">Thể loại:</span>
              {currentMovie.category.map((cat) => (
                <span
                  key={cat.id || cat.slug}
                  className="text-xs bg-[#1a1f2c] border border-white/10 text-slate-300 px-3 py-1 rounded-full font-medium"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Tóm Tắt Nội Dung
            </h4>
            {loading ? (
              <div className="py-6 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                <span className="text-xs">Đang tải thông tin chi tiết...</span>
              </div>
            ) : (
              <div
                className="text-xs sm:text-sm leading-relaxed text-slate-300 space-y-2 max-h-40 overflow-y-auto pr-2"
                dangerouslySetInnerHTML={{
                  __html: (detail?.content || 'Đang cập nhật nội dung cho bộ phim này...').replace(/<img[^>]*>/g, ''),
                }}
              />
            )}
          </div>

          {/* Action Button: Play now */}
          <div className="pt-2">
            <button
              onClick={() => {
                onPlay(currentMovie.slug);
                handleClose();
              }}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Xem Phim Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
