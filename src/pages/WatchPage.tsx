import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  Heart,
  Calendar,
  Clock,
  Eye,
  Star,
  Globe,
  Share2,
  Check,
  Maximize2,
  User,
  Clapperboard,
} from 'lucide-react';
import { getMovieDetail, getMoviesByType, getImageUrl, getMovieRating } from '../services/api';
import type { MovieDetail, EpisodeServer, EpisodeData, MovieItem } from '../types/movie';
import { VideoPlayer } from '../components/Artplayer';
import type { VideoPlayerRef } from '../components/Artplayer';
import { MovieCard } from '../components/MovieCard';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useFavorites } from '../hooks/useFavorites';

interface WatchPageProps {
  movieSlug: string;
  initialServer?: number;
  initialEpisodeSlug?: string;
  onSelectMovie: (slug: string) => void;
  onNavigate?: (route: string) => void;
  onOpenSearch?: (keyword: string, scope: 'actor' | 'director') => void;
}

function cleanEpisodeText(name?: string): string {
  if (!name) return 'Tập 01';
  const clean = name.trim();
  const num = clean.replace(/^tập\s*tập\s*/i, '').replace(/^tập\s*/i, '').trim();
  if (!num) return 'Tập 01';
  if (num.toLowerCase() === 'full') return 'Tập Full';
  return `Tập ${num}`;
}

export const WatchPage: React.FC<WatchPageProps> = ({
  movieSlug,
  initialServer = 0,
  initialEpisodeSlug,
  onSelectMovie,
  onNavigate,
  onOpenSearch,
}) => {
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeServer[]>([]);
  const [currentServer, setCurrentServer] = useState(initialServer);
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeData | null>(null);
  const [relatedMovies, setRelatedMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);

  const playerRef = useRef<VideoPlayerRef>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const { saveProgress, getSavedProgress } = useWatchHistory();
  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await getMovieDetail(movieSlug);
        if (res.movie) {
          setMovie(res.movie);
          const serverList = res.episodes || [];
          setEpisodes(serverList);

          const savedHistory = getSavedProgress(movieSlug);
          let chosenServer = initialServer;
          let chosenEpisode: EpisodeData | null = null;

          if (serverList.length > 0) {
            const server = serverList[chosenServer] || serverList[0];
            const epList = server.server_data || [];

            if (initialEpisodeSlug) {
              chosenEpisode = epList.find((e) => e.slug === initialEpisodeSlug) || epList[0];
            } else if (savedHistory && savedHistory.episodeSlug) {
              chosenServer = savedHistory.serverIndex || 0;
              const s = serverList[chosenServer] || serverList[0];
              chosenEpisode = s.server_data.find((e) => e.slug === savedHistory.episodeSlug) || s.server_data[0];
            } else {
              chosenEpisode = epList[0] || null;
            }
          }

          setCurrentServer(chosenServer);
          setCurrentEpisode(chosenEpisode);

          const related = await getMoviesByType('phim-le', 1);
          setRelatedMovies(related.items.slice(0, 8));
        }
      } catch (err) {
        console.error('Lỗi tải chi tiết phim:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [movieSlug]);

  if (loading || !movie) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-slate-400 gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-base font-semibold">Đang chuẩn bị thông tin phim...</p>
      </div>
    );
  }

  const savedHistory = getSavedProgress(movieSlug);
  const initialTime = savedHistory && savedHistory.episodeSlug === currentEpisode?.slug
    ? savedHistory.currentTime
    : 0;

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (currentEpisode && movie) {
      saveProgress({
        slug: movie.slug,
        name: movie.name,
        thumb_url: getImageUrl(movie.thumb_url || movie.poster_url),
        episodeName: currentEpisode.name,
        episodeSlug: currentEpisode.slug,
        serverIndex: currentServer,
        currentTime,
        duration,
      });
    }
  };

  const handleSelectEpisode = (serverIdx: number, ep: EpisodeData) => {
    setCurrentServer(serverIdx);
    setCurrentEpisode(ep);
    setTimeout(() => {
      playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoBack = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const prevRoute = sessionStorage.getItem('zen_prev_route');
    if (prevRoute) {
      const cleanRoute = prevRoute.replace(/^#\/?/, '').trim();
      if (cleanRoute && !cleanRoute.startsWith(`movie/${movieSlug}`)) {
        if (onNavigate) {
          onNavigate(cleanRoute);
          return;
        } else {
          window.location.hash = `/${cleanRoute}`;
          return;
        }
      }
    }

    if (window.history.length > 1) {
      window.history.back();
    } else if (onNavigate) {
      onNavigate('home');
    } else {
      window.location.hash = '/home';
    }
  };

  const isFav = isFavorite(movie.slug);
  const backdrop = getImageUrl(movie.thumb_url || movie.poster_url);
  const rating = getMovieRating(movie);

  let hash = 0;
  for (let i = 0; i < movie.slug.length; i++) {
    hash = (hash << 5) - hash + movie.slug.charCodeAt(i);
    hash |= 0;
  }
  const voteCount = movie.tmdb?.vote_count || (120 + Math.abs(hash % 380));
  const viewCount = movie.view || (25 + Math.abs(hash % 150));

  const currentServerObj = episodes[currentServer] || episodes[0];
  const episodeList = currentServerObj?.server_data || [];
  const statusText = movie.episode_current?.toLowerCase().includes('full')
    ? 'Hoàn thành'
    : (movie.episode_current || 'Hoàn thành');

  const totalEpCount = episodeList.length > 0 ? episodeList.length : 1;
  const epDisplayCount = movie.episode_current?.toLowerCase().includes('full')
    ? `Full / 1`
    : `${movie.episode_current || totalEpCount} / ${totalEpCount}`;

  const cleanContent = (movie.content || 'Đang cập nhật nội dung cho bộ phim này...').replace(/<img[^>]*>/g, '');

  return (
    <div className={`min-h-screen text-slate-100 ${theaterMode ? 'bg-black' : 'bg-[#0b0c10]'} pt-16 sm:pt-20`}>
      
      {/* Sub-header Bar (Matching Screenshot: ← Quay lại   [Tên phim] • [Tập]) */}
      <div className="w-full bg-[#0b0c10] border-b border-white/10 px-4 py-2.5 flex items-center justify-between relative z-40">
        <button
          type="button"
          onClick={handleGoBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer py-1.5 px-2.5 -ml-2 rounded-xl hover:bg-white/10 active:bg-white/20 select-none relative z-50 touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4 text-slate-300" />
          <span>Quay lại</span>
        </button>

        <div className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-[240px] sm:max-w-md text-right">
          {movie.name} • <span className="text-slate-300 font-semibold">{cleanEpisodeText(currentEpisode?.name)}</span>
        </div>
      </div>

      {/* Video Player Section */}
      <div ref={playerContainerRef} className="w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16 sm:pt-4 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Main Video Player & Mobile Episodes */}
          <div className="lg:col-span-9 space-y-3">
            <div className={`relative w-full aspect-video bg-black sm:rounded-2xl sm:overflow-hidden sm:glass-panel sm:border sm:border-white/10 shadow-2xl transition-all duration-300 ${theaterMode ? 'ring-4 ring-amber-500/50' : ''}`}>
              {currentEpisode?.link_m3u8 ? (
                <VideoPlayer
                  ref={playerRef}
                  url={currentEpisode.link_m3u8}
                  poster={backdrop}
                  title={movie.name}
                  episodeName={currentEpisode.name}
                  startTime={initialTime}
                  onTimeUpdate={handleTimeUpdate}
                />
              ) : currentEpisode?.link_embed ? (
                <iframe
                  src={currentEpisode.link_embed}
                  title={currentEpisode.name}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <p>Tập phim chưa có nguồn phát trực tiếp</p>
                </div>
              )}
            </div>

            {/* Quick Actions Bar under player (Always visible on TV / Web) */}
            <div className="flex flex-wrap items-center justify-between text-xs py-1.5 px-1 text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  {movie.name} • <span className="text-red-500 font-semibold">{cleanEpisodeText(currentEpisode?.name)}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => playerRef.current?.toggleFullscreen()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all bg-red-600 hover:bg-red-700 active:scale-95 text-white border-red-500 shadow-md shadow-red-600/30"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Toàn màn hình</span>
                </button>

                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setTheaterMode(!theaterMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    theaterMode ? 'bg-amber-500 text-black border-amber-400 font-bold' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{theaterMode ? 'Thoát Rạp Chiếu' : 'Rạp Chiếu'}</span>
                </button>
              </div>
            </div>

            {/* Mobile & Tablet Episodes Section matching Screenshot directly below player */}
            <div className="px-4 sm:px-0 pt-2 pb-4 border-b border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Danh sách tập phim
                </h2>

                {episodes.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {episodes.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentServer(idx)}
                        className={`text-xs px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          currentServer === idx
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
                        }`}
                      >
                        {s.server_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs font-bold text-red-500 uppercase tracking-wide">
                {currentServerObj?.server_name || 'Vietsub'}
              </p>

              {/* Horizontal scrollable row of episodes exactly matching screenshot */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {episodeList.map((ep) => {
                  const isActive = ep.slug === currentEpisode?.slug;
                  return (
                    <button
                      key={ep.slug}
                      onClick={() => handleSelectEpisode(currentServer, ep)}
                      className={`shrink-0 py-2 px-4 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer text-center ${
                        isActive
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/40 ring-1 ring-red-400'
                          : 'bg-[#121826] hover:bg-[#1c2438] text-slate-200 border border-white/10'
                      }`}
                      title={ep.name}
                    >
                      {cleanEpisodeText(ep.name)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop Episodes Sidebar */}
          <div className="hidden lg:block lg:col-span-3 glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="text-sm font-bold text-red-500 tracking-wide uppercase">
                {currentServerObj?.server_name || 'Vietsub'}
              </h3>
              {episodes.length > 1 && (
                <div className="flex items-center gap-1">
                  {episodes.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentServer(idx)}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        currentServer === idx
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400'
                      }`}
                    >
                      #{idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grid of Episodes for Desktop */}
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 max-h-[480px] overflow-y-auto pr-1">
              {episodeList.map((ep) => {
                const isActive = ep.slug === currentEpisode?.slug;
                return (
                  <button
                    key={ep.slug}
                    onClick={() => handleSelectEpisode(currentServer, ep)}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer text-center truncate ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/40 ring-1 ring-red-400'
                        : 'bg-[#0e121d] hover:bg-[#1a2234] text-slate-300 border border-white/5 hover:border-white/20'
                    }`}
                    title={ep.name}
                  >
                    {cleanEpisodeText(ep.name)}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Movie Details and Description Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-4 pb-16 space-y-7">
        
        {/* Movie Actions Bar (Favorite & Share) */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => toggleFavorite(movie)}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
              isFav
                ? 'bg-red-600/20 text-red-400 border-red-500/40'
                : 'bg-[#1a1f2c]/90 hover:bg-[#252c3d] text-slate-200 border-white/10'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-300'}`} />
            <span>{isFav ? 'Đã Lưu Yêu Thích' : 'Thêm vào yêu thích'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1f2c]/90 hover:bg-[#252c3d] text-slate-300 border border-white/10 cursor-pointer text-xs sm:text-sm"
            title="Chia sẻ phim"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Đã sao chép link' : 'Chia sẻ'}</span>
          </button>
        </div>

        {/* 1. Movie Synopsis */}
        <div className="space-y-2.5">
          <h2 className="text-base sm:text-lg font-bold text-white">
            Nội dung phim
          </h2>
          <div
            className="text-xs sm:text-sm leading-relaxed text-slate-300 space-y-2 text-justify"
            dangerouslySetInnerHTML={{ __html: cleanContent }}
          />
        </div>

        {/* 2. Movie Metadata Badges & Specs */}
        <div className="pt-4 border-t border-white/10 space-y-3.5 text-xs sm:text-sm">
          <div className="flex items-center gap-3.5 text-xs sm:text-sm font-semibold text-slate-300 flex-wrap">
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{rating}</span>
              <span className="text-slate-400 text-xs font-normal">({voteCount})</span>
            </div>

            {movie.year && (
              <div className="flex items-center gap-1 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{movie.year}</span>
              </div>
            )}

            {movie.time && (
              <div className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{movie.time}</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-slate-300">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{viewCount}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-medium">Trạng thái</span>
            <p className="font-semibold text-white">{statusText}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-medium">Số tập</span>
            <p className="font-semibold text-white">{epDisplayCount}</p>
          </div>

          {movie.category && movie.category.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-slate-400 text-xs font-medium">Thể loại</span>
              <div className="flex items-center gap-2 flex-wrap">
                {movie.category.map((cat) => (
                  <span
                    key={cat.id || cat.slug}
                    className="text-xs bg-[#182030] text-slate-300 border border-white/10 px-3 py-1 rounded-full font-medium"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {movie.country && movie.country.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-slate-400 text-xs font-medium">Quốc gia</span>
              <div className="flex items-center gap-2 flex-wrap">
                {movie.country.map((c) => (
                  <span
                    key={c.id || c.slug}
                    className="text-xs bg-[#182030] text-slate-300 border border-white/10 px-3 py-1 rounded-full font-medium flex items-center gap-1.5"
                  >
                    <Globe className="w-3 h-3 text-cyan-400" />
                    <span>{c.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {movie.actor && movie.actor.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-slate-400 text-xs font-medium">Diễn viên</span>
              <div className="flex flex-wrap gap-1.5">
                {movie.actor.map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => onOpenSearch?.(act, 'actor')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-600/20 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-xs text-slate-300 font-medium transition-colors cursor-pointer"
                    title={`Tìm tất cả phim của diễn viên ${act}`}
                  >
                    <User className="w-3 h-3 text-red-400" />
                    <span>{act}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {movie.director && movie.director.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-slate-400 text-xs font-medium">Đạo diễn</span>
              <div className="flex flex-wrap gap-1.5">
                {movie.director.map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => onOpenSearch?.(dir, 'director')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 text-xs text-slate-300 font-medium transition-colors cursor-pointer"
                    title={`Tìm tất cả phim do đạo diễn ${dir} thực hiện`}
                  >
                    <Clapperboard className="w-3 h-3 text-amber-400" />
                    <span>{dir}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Related Movies */}
        {relatedMovies.length > 0 && (
          <div className="pt-8 border-t border-white/10 space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Phim Đề Xuất Cho Bạn
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {relatedMovies.slice(0, 4).map((m) => (
                <MovieCard key={m.slug} movie={m} onSelect={onSelectMovie} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
