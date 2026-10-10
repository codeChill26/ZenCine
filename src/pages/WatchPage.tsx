import React, { useEffect, useState, useRef } from 'react';
import {
  Heart,
  Calendar,
  Clock,
  Eye,
  Star,
  Play,
  Maximize2,
  Globe,
  Share2,
  Check,
  ChevronUp,
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
}

export const WatchPage: React.FC<WatchPageProps> = ({
  movieSlug,
  initialServer = 0,
  initialEpisodeSlug,
  onSelectMovie,
}) => {
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeServer[]>([]);
  const [currentServer, setCurrentServer] = useState(initialServer);
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeData | null>(null);
  const [relatedMovies, setRelatedMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const playerRef = useRef<VideoPlayerRef>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const { saveProgress, getSavedProgress } = useWatchHistory();
  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setShowPlayer(false);
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
              setShowPlayer(true);
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

  const handleStartWatching = () => {
    setShowPlayer(true);
    setTimeout(() => {
      playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSelectEpisode = (serverIdx: number, ep: EpisodeData) => {
    setCurrentServer(serverIdx);
    setCurrentEpisode(ep);
    setShowPlayer(true);
    setTimeout(() => {
      playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className={`min-h-screen text-slate-100 ${theaterMode ? 'bg-black' : 'bg-[#0b0c10]'}`}>
      
      {/* Video Player Section with Desktop Side-by-Side Episode Layout matching Reference Image 2 */}
      {showPlayer && (
        <div ref={playerContainerRef} className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-6 animate-in fade-in duration-300">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* Player Container (Takes 9 columns on wide screens) */}
            <div className="lg:col-span-9 space-y-2">
              <div className={`relative w-full rounded-2xl overflow-hidden glass-panel border border-white/10 shadow-2xl transition-all duration-500 ${theaterMode ? 'ring-4 ring-amber-500/50' : ''}`}>
                <div className="aspect-video w-full bg-black relative">
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
              </div>

              {/* Quick Actions Bar under player */}
              <div className="flex items-center justify-between text-xs py-1 px-1 text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {movie.name} • <span className="text-red-500 font-semibold">{currentEpisode?.name || 'Full'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTheaterMode(!theaterMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      theaterMode ? 'bg-amber-500 text-black border-amber-400 font-bold' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>{theaterMode ? 'Thoát Rạp Chiếu' : 'Rạp Chiếu'}</span>
                  </button>

                  <button
                    onClick={() => setShowPlayer(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Thu Gọn</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Episodes Sidebar matching Image 2 (Takes 3 columns on wide screens) */}
            <div className="lg:col-span-3 glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
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

              {/* Grid of Episodes matching Image 2 */}
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
                      {ep.name}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Main Movie Layout - Matching Image 1 & Image 2 */}
      <div className={`relative w-full ${showPlayer ? 'pt-2' : 'pt-16 sm:pt-20'} pb-16`}>

        {/* Hero Backdrop Banner Section */}
        <div className="relative w-full min-h-[380px] sm:min-h-[460px] overflow-hidden flex items-end">
          <div className="absolute inset-0 z-0">
            <img
              src={backdrop}
              alt={movie.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top filter brightness-[0.7] contrast-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/70 to-[#0b0c10]/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10]/90 via-[#0b0c10]/40 to-transparent" />
          </div>

          <div className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-8 pb-6 pt-12 space-y-3.5">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md">
              {movie.name}
            </h1>

            {movie.origin_name && (
              <p className="text-sm sm:text-base font-semibold text-slate-400 drop-shadow">
                {movie.origin_name}
              </p>
            )}

            <div className="flex items-center gap-3.5 text-xs sm:text-sm font-semibold text-slate-300 flex-wrap pt-0.5">
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

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="bg-red-600 text-white font-bold text-[11px] px-2.5 py-0.5 rounded shadow-md uppercase">
                {movie.quality || 'FHD'}
              </span>

              <span className="bg-[#0066ff] text-white font-bold text-[11px] px-2.5 py-0.5 rounded shadow-md">
                {movie.lang || 'Vietsub'}
              </span>

              {movie.country && movie.country[0] && (
                <span className="bg-[#182030]/90 text-slate-200 border border-white/10 text-xs px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>{movie.country[0].name}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 max-w-md">
              <button
                onClick={handleStartWatching}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-red-600/40 hover:scale-102 active:scale-98 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{showPlayer ? 'Đang Xem Phim' : 'Xem phim'}</span>
              </button>

              <button
                onClick={() => toggleFavorite(movie)}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
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
                className="p-3 rounded-xl bg-[#1a1f2c]/90 hover:bg-[#252c3d] text-slate-300 border border-white/10 flex items-center justify-center cursor-pointer transition-all sm:w-auto"
                title="Chia sẻ phim"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Content Section (Nội dung phim + Danh sách tập phim + Chi tiết phim) */}
        <div className="max-w-4xl mx-auto px-5 sm:px-8 mt-6 space-y-7">

          {/* 1. Nội Dung Phim */}
          <div className="space-y-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Nội dung phim
            </h2>
            <div
              className="text-xs sm:text-sm leading-relaxed text-slate-300 space-y-2 text-justify"
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />
          </div>

          {/* 2. Danh Sách Tập Phim (Dưới Nội dung phim) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Danh sách tập phim
              </h2>

              {episodes.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {episodes.map((serverItem, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentServer(idx)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        currentServer === idx
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
                      }`}
                    >
                      {serverItem.server_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs font-semibold text-red-500">
              Server: {currentServerObj?.server_name || 'Vietsub'}
            </p>

            {episodeList.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pt-1">
                {episodeList.map((ep) => {
                  const isActive = ep.slug === currentEpisode?.slug;
                  return (
                    <button
                      key={ep.slug}
                      onClick={() => handleSelectEpisode(currentServer, ep)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-center truncate ${
                        isActive
                          ? 'bg-red-600 text-white ring-2 ring-red-400/50 shadow-lg shadow-red-600/40 scale-102'
                          : 'bg-[#151a26]/90 hover:bg-[#1f2638] text-slate-200 border border-white/5 hover:border-white/20'
                      }`}
                      title={ep.name}
                    >
                      {ep.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 text-center text-xs text-slate-400">
                Đang cập nhật danh sách tập cho phim này
              </div>
            )}
          </div>

          {/* 3. Thông Tin Chi Tiết Phim */}
          <div className="pt-4 border-t border-white/10 space-y-3.5 text-xs sm:text-sm">
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
                      className="text-xs bg-[#182030] text-slate-300 border border-white/10 px-3 py-1 rounded-full font-medium"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {movie.actor && movie.actor.length > 0 && (
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-medium">Diễn viên</span>
                <p className="text-slate-300 leading-relaxed font-normal">
                  {movie.actor.join(', ')}
                </p>
              </div>
            )}

            {movie.director && movie.director.length > 0 && (
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-medium">Đạo diễn</span>
                <p className="text-slate-300 leading-relaxed font-normal">
                  {movie.director.join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* 4. Phim Đề Xuất Cho Bạn */}
          {relatedMovies.length > 0 && (
            <div className="pt-8 border-t border-white/10 space-y-4">
              <h3 className="text-lg sm:text-xl font-bold text-white">
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
    </div>
  );
};
