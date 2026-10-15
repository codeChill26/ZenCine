import React, { useState } from 'react';
import { Play, Server, Layers } from 'lucide-react';
import type { EpisodeServer, EpisodeData } from '../types/movie';

interface EpisodeGridProps {
  episodes: EpisodeServer[];
  activeServerIndex: number;
  activeEpisodeSlug: string;
  onSelectEpisode: (serverIndex: number, episode: EpisodeData) => void;
}

export const EpisodeGrid: React.FC<EpisodeGridProps> = ({
  episodes,
  activeServerIndex,
  activeEpisodeSlug,
  onSelectEpisode,
}) => {
  const [selectedServer, setSelectedServer] = useState(activeServerIndex || 0);
  const [activeChunk, setActiveChunk] = useState(0);

  if (!episodes || episodes.length === 0) return null;

  const currentServer = episodes[selectedServer] || episodes[0];
  const episodeList = currentServer.server_data || [];

  const CHUNK_SIZE = 50;
  const totalChunks = Math.ceil(episodeList.length / CHUNK_SIZE);
  const displayedEpisodes = episodeList.slice(
    activeChunk * CHUNK_SIZE,
    (activeChunk + 1) * CHUNK_SIZE
  );

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Server className="w-4 h-4 text-red-500" />
          <span>Danh Sách Máy Chủ:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {episodes.map((server, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedServer(idx);
                setActiveChunk(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                selectedServer === idx
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
              }`}
            >
              {server.server_name || `Server #${idx + 1}`}
            </button>
          ))}
        </div>
      </div>

      {totalChunks > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 mr-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            Phân đoạn:
          </span>
          {Array.from({ length: totalChunks }).map((_, cIdx) => {
            const start = cIdx * CHUNK_SIZE + 1;
            const end = Math.min((cIdx + 1) * CHUNK_SIZE, episodeList.length);
            return (
              <button
                key={cIdx}
                onClick={() => setActiveChunk(cIdx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeChunk === cIdx
                    ? 'bg-white/20 text-white font-bold border border-white/20'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {start} - {end}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[350px] overflow-y-auto pr-1">
        {displayedEpisodes.map((ep) => {
          const isActive = ep.slug === activeEpisodeSlug && selectedServer === activeServerIndex;
          return (
              <button
                key={ep.slug}
                onClick={() => onSelectEpisode(selectedServer, ep)}
                onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
                className={`flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:scale-110 focus-visible:shadow-lg focus-visible:shadow-red-600/50 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white ring-2 ring-red-400/50 shadow-lg shadow-red-600/30 scale-105'
                    : 'bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border border-white/5 hover:border-white/20'
                }`}
                title={ep.name}
              >
                {isActive && <Play className="w-3 h-3 fill-white" />}
                <span className="truncate">{ep.name}</span>
              </button>
          );
        })}
      </div>
    </div>
  );
};
