import { Logo } from './Logo';
import React, { useState, useEffect, useRef } from 'react';
import { Search, History, Heart, Menu, X, ChevronDown, User, Layers, Globe } from 'lucide-react';
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

  const genreTimerRef = useRef<any>(null);
  const countryTimerRef = useRef<any>(null);
  const isMenuPushedRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Back button handling on mobile phones to close mobile menu
  const openMobileMenu = () => {
    setMobileMenuOpen(true);
    if (!isMenuPushedRef.current) {
      window.history.pushState({ zenModal: 'mobileMenu' }, '');
      isMenuPushedRef.current = true;
    }
  };

  const closeMobileMenu = (fromPopState = false, shouldBack = true) => {
    setMobileMenuOpen(false);
    if (!fromPopState && shouldBack && isMenuPushedRef.current) {
      isMenuPushedRef.current = false;
      window.history.back();
    } else {
      isMenuPushedRef.current = false;
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (mobileMenuOpen) {
        closeMobileMenu(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mobileMenuOpen]);

  // Hover handlers for Desktop dropdowns
  const handleGenreMouseEnter = () => {
    if (genreTimerRef.current) clearTimeout(genreTimerRef.current);
    setGenreDropdown(true);
    setCountryDropdown(false);
  };
  const handleGenreMouseLeave = () => {
    genreTimerRef.current = setTimeout(() => {
      setGenreDropdown(false);
    }, 180);
  };

  const handleCountryMouseEnter = () => {
    if (countryTimerRef.current) clearTimeout(countryTimerRef.current);
    setCountryDropdown(true);
    setGenreDropdown(false);
  };
  const handleCountryMouseLeave = () => {
    countryTimerRef.current = setTimeout(() => {
      setCountryDropdown(false);
    }, 180);
  };

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
      <div className="w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16">
        <div className="flex items-center justify-between">
          
          <button
            onClick={() => onNavigate('home')}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-xl cursor-pointer p-0.5 text-left"
            aria-label="Về trang chủ ZenCine"
          >
            <Logo size="md" />
          </button>

          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2.5">
            {navLinks.map((item) => (
              <button
                key={item.route}
                onClick={() => onNavigate(item.route)}
                className={`px-4 py-2.5 rounded-xl text-sm lg:text-base font-bold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                  currentRoute === item.route
                    ? 'text-white bg-red-600/30 border border-red-500/40 shadow-lg shadow-red-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Desktop Thể Loại (Hover to open) */}
            <div
              className="relative"
              onMouseEnter={handleGenreMouseEnter}
              onMouseLeave={handleGenreMouseLeave}
            >
              <button
                onClick={() => {
                  setGenreDropdown(!genreDropdown);
                  setCountryDropdown(false);
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm lg:text-base font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                  genreDropdown || currentRoute.startsWith('category:')
                    ? 'text-white bg-red-600/30 border border-red-500/40 shadow-lg shadow-red-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>Thể Loại</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${genreDropdown ? 'rotate-180' : ''}`} />
              </button>

              {genreDropdown && (
                <div
                  className="absolute top-full left-0 mt-2 w-72 glass-panel rounded-2xl p-3 shadow-2xl grid grid-cols-2 gap-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50 border border-white/10 bg-[#0f131f]/95 backdrop-blur-2xl"
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => {
                        onNavigate(`category:${cat.slug}`);
                        setGenreDropdown(false);
                      }}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentRoute === `category:${cat.slug}`
                          ? 'text-red-400 bg-red-600/20 font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-red-600/20 hover:text-red-400'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Quốc Gia (Hover to open) */}
            <div
              className="relative"
              onMouseEnter={handleCountryMouseEnter}
              onMouseLeave={handleCountryMouseLeave}
            >
              <button
                onClick={() => {
                  setCountryDropdown(!countryDropdown);
                  setGenreDropdown(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  countryDropdown || currentRoute.startsWith('country:')
                    ? 'text-white bg-white/10 shadow-inner'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Quốc Gia</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${countryDropdown ? 'rotate-180' : ''}`} />
              </button>

              {countryDropdown && (
                <div
                  className="absolute top-full left-0 mt-2 w-60 glass-panel rounded-2xl p-3 shadow-2xl grid grid-cols-2 gap-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50 border border-white/10 bg-[#0f131f]/95 backdrop-blur-2xl"
                >
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => {
                        onNavigate(`country:${c.slug}`);
                        setCountryDropdown(false);
                      }}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentRoute === `country:${c.slug}`
                          ? 'text-red-400 bg-red-600/20 font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-red-600/20 hover:text-red-400'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop/TV Right Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              title="Tìm kiếm phim (Ctrl+K)"
              aria-label="Tìm kiếm phim"
            >
              <Search className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
              <span className="text-sm font-medium text-slate-300">Tìm kiếm...</span>
              <kbd className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-slate-400 border border-white/10 font-mono">
                Ctrl+K
              </kbd>
            </button>

            <button
              onClick={() => onNavigate('history')}
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                currentRoute === 'history'
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
              title="Lịch sử xem phim"
              aria-label="Lịch sử xem phim"
            >
              <History className="w-5 h-5" />
            </button>

            <button
              onClick={() => onNavigate('favorites')}
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                currentRoute === 'favorites'
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
              title="Phim đã lưu"
              aria-label="Phim đã lưu"
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Right Actions: Search, User, Menu */}
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
              onClick={() => {
                if (mobileMenuOpen) {
                  closeMobileMenu();
                } else {
                  openMobileMenu();
                }
              }}
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
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[-1]"
              onClick={() => closeMobileMenu()}
            />

            <div className="md:hidden mt-3 pb-6 border-t border-white/10 pt-3 space-y-3 max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Primary Nav Links */}
              <div className="space-y-1">
                {navLinks.map((item) => (
                  <button
                    key={item.route}
                    onClick={() => {
                      onNavigate(item.route);
                      closeMobileMenu(false, false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                      currentRoute === item.route
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{item.label}</span>
                    {currentRoute === item.route && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                    )}
                  </button>
                ))}
              </div>

              {/* Full Categories Section on Mobile */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-red-400 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Thể Loại Phim ({CATEGORIES.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => {
                        onNavigate(`category:${cat.slug}`);
                        closeMobileMenu(false, false);
                      }}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                        currentRoute === `category:${cat.slug}`
                          ? 'bg-red-600 text-white border-red-500 font-bold'
                          : 'bg-white/5 border-white/5 text-slate-300 hover:text-white hover:bg-white/10 active:bg-red-600/20'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Countries Section on Mobile */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Quốc Gia ({COUNTRIES.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-2">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => {
                        onNavigate(`country:${c.slug}`);
                        closeMobileMenu(false, false);
                      }}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                        currentRoute === `country:${c.slug}`
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : 'bg-white/5 border-white/5 text-slate-300 hover:text-white hover:bg-white/10 active:bg-blue-600/20'
                      }`}
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

