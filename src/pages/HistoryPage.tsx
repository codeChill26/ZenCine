import React from 'react';
import { History, Trash2, PlayCircle, Clock } from 'lucide-react';
import { useWatchHistory } from '../hooks/useWatchHistory';

interface HistoryPageProps {
  onSelectMovie: (slug: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectMovie }) => {
  const { history, clearHistory, removeHistoryItem } = useWatchHistory();

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Lịch Sử Xem Phim</h1>
            <p className="text-xs text-slate-400 mt-0.5">Tiếp tục thưởng thức các tập phim bạn đang xem dở</p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 text-xs font-semibold border border-red-500/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa Tất Cả</span>
          </button>
        )}
      </div>

      {/* History List */}
      {history.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {history.map((item) => {
            const percent = item.duration > 0 ? Math.round((item.currentTime / item.duration) * 100) : 0;
            return (
              <div
                key={item.slug}
                onClick={() => onSelectMovie(item.slug)}
                className="group relative glass-panel rounded-2xl overflow-hidden cursor-pointer hover:border-red-500/40 hover:-translate-y-1 transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                  <img
                    src={item.thumb_url} referrerPolicy="no-referrer"
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                    <div className="h-full bg-red-600" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistoryItem(item.slug);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Xóa mục này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="text-red-400 font-semibold">{item.episodeName}</span>
                    <span>Đã xem {percent}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center text-slate-500 space-y-3">
          <Clock className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-base font-semibold text-slate-300">Chưa có lịch sử xem phim nào</p>
          <p className="text-xs">Khi bạn xem bất kỳ bộ phim nào, mốc thời gian sẽ tự động được lưu lại tại đây.</p>
        </div>
      )}

    </div>
  );
};
