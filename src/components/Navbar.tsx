import { Logo } from './Logo';
import React, { useState, useEffect } from 'react';
import { Search, History, Heart, Menu, X, ChevronDown, User } from 'lucide-react';
import { CATEGORIES, COUNTRIES } from '../services/api';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, onNavigate, onOpenSearch }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [genreDropdown, setGenreDropdown] = useState(false);
  const [countryDropdown, setCountryDropdown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Trang Chủ', route: 'home' },
    { label: 'Phim Lẻ', route: 'type:phim-le' },
    { label: 'Phim Bộ', route: 'type:phim-bo' },
    { label: 'Hoạt Hình', route: 'type:hoat-hinh' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        mobileMenuOpen
          ? 'bg-[#0b0c10] border-b border-white/10 shadow-2xl py-3.5'
          : scrolled
            ? 'glass-nav py-3'
            : 'bg-gradient-to-b from-[#0b0c10]/95 via-[#0b0c10]/70 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          <div onClick={() => onNavigate('home')}>
            <Logo size="md" />
          </div>

          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((item) => (
              <button
                key={item.route}
                onClick={() => onNavigate(item.route)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  currentRoute === item.route
                    ? 'text-white bg-white/10 shadow-inner'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}

            <div className="relative">
              <button
                onClick={() => {
                  setGenreDropdown(!genreDropdown);
                  setCountryDropdown(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <span>Thể Loại</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${genreDropdown ? 'rotate-180' : ''}`} />
              </button>

              {genreDropdown && (
                <div
                  className="absolute top-full left-0 mt-2 w-72 glass-panel rounded-2xl p-3 shadow-2xl grid grid-cols-2 gap-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                  onMouseLeave={() => setGenreDropdown(false)}
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => {
                        onNavigate(`category:${cat.slug}`);
                        setGenreDropdown(false);
                      }}
                      className="text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-red-600/20 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setCountryDropdown(!countryDropdown);
                  setGenreDropdown(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <span>Quốc Gia</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${countryDropdown ? 'rotate-180' : ''}`} />
              </button>

              {countryDropdown && (
                <div
                  className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-3 shadow-2xl grid grid-cols-2 gap-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                  onMouseLeave={() => setCountryDropdown(false)}
                >
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => {
                        onNavigate(`country:${c.slug}`);
                        setCountryDropdown(false);
                      }}
                      className="text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-red-600/20 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all duration-200 group cursor-pointer"
              title="Tìm kiếm phim (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
              <span className="text-xs font-medium text-slate-400">Tìm kiếm...</span>
              <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400 border border-white/10 font-mono">
                Ctrl+K
              </kbd>
            </button>

            <button
              onClick={() => onNavigate('history')}
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                currentRoute === 'history'
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
              title="Lịch sử xem phim"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('favorites')}
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                currentRoute === 'favorites'
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
              title="Phim đã lưu"
            >
              <Heart className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Right Actions: Search, User, Menu matching screenshot */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={onOpenSearch}
              className="p-2 text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer"
              title="Tìm kiếm"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={() => onNavigate('favorites')}
              className="p-2 text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer"
              title="Tài khoản / Yêu thích"
            >
              <User className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer"
              title="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <>
            {/* Click-outside backdrop overlay */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[-1]"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="md:hidden mt-3 pb-4 border-t border-white/10 pt-3 space-y-2 max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
              {navLinks.map((item) => (
                <button
                  key={item.route}
                  onClick={() => {
                    onNavigate(item.route);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    currentRoute === item.route
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <div className="pt-2 border-t border-white/10">
                <div className="text-xs font-semibold text-slate-400 px-4 py-1.5 uppercase tracking-wider">
                  Thể Loại Nổi Bật
                </div>
                <div className="grid grid-cols-2 gap-1 p-2">
                  {CATEGORIES.slice(0, 8).map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => {
                        onNavigate(`category:${cat.slug}`);
                        setMobileMenuOpen(false);
                      }}
                      className="text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 active:bg-red-600/20 transition-colors cursor-pointer"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <div className="text-xs font-semibold text-slate-400 px-4 py-1.5 uppercase tracking-wider">
                  Quốc Gia
                </div>
                <div className="grid grid-cols-2 gap-1 p-2">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => {
                        onNavigate(`country:${c.slug}`);
                        setMobileMenuOpen(false);
                      }}
                      className="text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 active:bg-red-600/20 transition-colors cursor-pointer"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
