import React from 'react';
import { Home, Film, Tv, Search, Clock } from 'lucide-react';

interface MobileBottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenSearch: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRoute,
  onNavigate,
  onOpenSearch,
}) => {
  const tabs = [
    { id: 'home', label: 'Trang Chủ', icon: Home, action: () => onNavigate('home') },
    { id: 'type:phim-le', label: 'Phim Lẻ', icon: Film, action: () => onNavigate('type:phim-le') },
    { id: 'type:phim-bo', label: 'Phim Bộ', icon: Tv, action: () => onNavigate('type:phim-bo') },
    { id: 'search', label: 'Tìm Kiếm', icon: Search, action: onOpenSearch },
    { id: 'history', label: 'Lịch Sử', icon: Clock, action: () => onNavigate('history') },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-white/10 px-2 pt-1.5 pb-safe backdrop-blur-2xl bg-[#0b0c10]/95 shadow-2xl">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.id === 'search'
              ? false
              : currentRoute === tab.id || (tab.id === 'home' && currentRoute === '');

          return (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive ? 'text-red-500 scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500 shadow-sm shadow-red-500" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
