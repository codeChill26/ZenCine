import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { HomePage } from './pages/HomePage';
import { WatchPage } from './pages/WatchPage';
import { CatalogPage } from './pages/CatalogPage';
import { HistoryPage } from './pages/HistoryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { initSpatialNavigation } from './utils/spatialNavigation';

export interface ParsedRoute {
  raw: string;
  path: string;
  page: number;
}

export function parseRoute(hashString: string): ParsedRoute {
  const raw = hashString.replace(/^#\/?/, '').trim() || 'home';
  const [path, queryString] = raw.split('?');
  const params = new URLSearchParams(queryString || '');
  const parsedPage = parseInt(params.get('page') || '1', 10);
  const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  return {
    raw,
    path: path || 'home',
    page,
  };
}

export function App() {
  const [currentRoute, setCurrentRoute] = useState<ParsedRoute>(() => {
    return parseRoute(window.location.hash);
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialKeyword, setSearchInitialKeyword] = useState('');
  const [searchInitialScope, setSearchInitialScope] = useState<'all' | 'actor' | 'director' | 'movie'>('all');

  const handleOpenSearch = (keyword = '', scope: 'all' | 'actor' | 'director' | 'movie' = 'all') => {
    setSearchInitialKeyword(keyword);
    setSearchInitialScope(scope);
    setSearchOpen(true);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseRoute(window.location.hash);
      setCurrentRoute(parsed);
      const hasSavedScroll = sessionStorage.getItem(`scroll_pos_${window.location.hash}`) !== null;
      if (!hasSavedScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    const handleGoBack = (e?: Event) => {
      // 1. Nếu video đang mở toàn màn hình: Thoát toàn màn hình trước
      const fsPlayer = document.querySelector('.art-video-player.art-fullscreen');
      if (fsPlayer) {
        e?.preventDefault?.();
        window.dispatchEvent(new CustomEvent('tv-exit-fullscreen'));
        return;
      }

      // 2. Nếu đang mở khung tìm kiếm: Đóng tìm kiếm
      if (searchOpen) {
        e?.preventDefault?.();
        setSearchOpen(false);
        return;
      }

      // 3. Nếu đang ở trang xem phim hoặc danh mục (khác Trang chủ): Quay lại trang trước hoặc về Home
      const currentHash = window.location.hash || '#/home';
      if (currentHash !== '#/home' && currentHash !== '#home' && currentHash !== '') {
        e?.preventDefault?.();
        const prev = sessionStorage.getItem('zen_prev_route');
        if (prev && prev !== currentHash) {
          window.location.hash = prev;
        } else {
          window.location.hash = '#/home';
        }
        return;
      }

      // 4. Nếu đã ở Trang chủ: Cho phép đóng app bằng ZenNative bridge (Android TV) hoặc webOS platformBack (LG TV)
      try {
        if ((window as any).ZenNative?.exitApp) {
          (window as any).ZenNative.exitApp();
        } else if ((window as any).webOSSystem?.platformBack) {
          (window as any).webOSSystem.platformBack();
        } else if ((window as any).webOS?.platformBack) {
          (window as any).webOS.platformBack();
        } else if (typeof window.close === 'function') {
          window.close();
        }
      } catch (_) {}
    };

    // Gắn vào window để MainActivity.java gọi trực tiếp khi bấm nút BACK trên Remote Sony
    (window as any).zenHandleTvBack = handleGoBack;

    const isTV = /smart-tv|googletv|appletv|hbbtv|pov_tv|netcast.tv|webos|viera|tizen|android\s*tv/i.test(navigator.userAgent);
    if (isTV) {
      document.body.classList.add('tv-mode');
    }

    // Khởi tạo hệ thống điều hướng 2D D-Pad (Lên, Xuống, Trái, Phải, OK)
    const cleanupSpatialNav = initSpatialNavigation();

    const handleTvKeyDown = (e: KeyboardEvent) => {
      // 4: Android TV Back, 461: webOS VK_BACK, 10009: Tizen VK_RETURN/BACK, 27: Escape
      const isBackKey =
        e.keyCode === 4 ||
        e.keyCode === 461 ||
        e.keyCode === 10009 ||
        e.keyCode === 27 ||
        e.key === 'Escape' ||
        e.key === 'GoBack' ||
        e.key === 'Back';

      if (isBackKey) {
        handleGoBack(e);
      }
    };

    const handleCapacitorBack = (e: Event) => {
      handleGoBack(e);
    };

    window.addEventListener('keydown', handleTvKeyDown);
    document.addEventListener('backbutton', handleCapacitorBack as any);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleTvKeyDown);
      document.removeEventListener('backbutton', handleCapacitorBack as any);
      cleanupSpatialNav();
      delete (window as any).zenHandleTvBack;
    };
  }, [searchOpen]);

  const navigateTo = (newRoute: string) => {
    window.location.hash = `/${newRoute}`;
  };

  const handleSelectMovie = (slug: string) => {
    const currentHash = window.location.hash || '#/home';
    try {
      sessionStorage.setItem(`scroll_pos_${currentHash}`, String(window.scrollY));
      sessionStorage.setItem('zen_prev_route', currentHash);
    } catch (_) {}
    navigateTo(`movie/${slug}`);
  };

  const { path, page } = currentRoute;
  let pageContent: React.ReactNode = null;

  if (path.startsWith('movie/')) {
    const movieSlug = path.replace(/^movie\//, '');
    pageContent = (
      <WatchPage
        movieSlug={movieSlug}
        onSelectMovie={handleSelectMovie}
        onNavigate={navigateTo}
        onOpenSearch={handleOpenSearch}
      />
    );
  } else if (path.startsWith('type:')) {
    const typeSlug = path.replace(/^type:/, '');
    pageContent = (
      <CatalogPage
        filterType="type"
        slug={typeSlug}
        initialPage={page}
        onSelectMovie={handleSelectMovie}
        onNavigate={navigateTo}
      />
    );
  } else if (path.startsWith('category:')) {
    const catSlug = path.replace(/^category:/, '');
    pageContent = (
      <CatalogPage
        filterType="category"
        slug={catSlug}
        initialPage={page}
        onSelectMovie={handleSelectMovie}
        onNavigate={navigateTo}
      />
    );
  } else if (path.startsWith('country:')) {
    const countrySlug = path.replace(/^country:/, '');
    pageContent = (
      <CatalogPage
        filterType="country"
        slug={countrySlug}
        initialPage={page}
        onSelectMovie={handleSelectMovie}
        onNavigate={navigateTo}
      />
    );
  } else if (path === 'history') {
    pageContent = <HistoryPage onSelectMovie={handleSelectMovie} />;
  } else if (path === 'favorites') {
    pageContent = <FavoritesPage onSelectMovie={handleSelectMovie} />;
  } else {
    pageContent = <HomePage onSelectMovie={handleSelectMovie} onNavigate={navigateTo} />;
  }

  const isWatchPage = path.startsWith('movie/');

  return (
    <div className={`min-h-screen flex flex-col bg-[#0b0c10] text-slate-100 ${isWatchPage ? 'pb-0' : 'pb-16 sm:pb-0'}`}>
      <Navbar
        currentRoute={path}
        onNavigate={navigateTo}
        onOpenSearch={() => handleOpenSearch('', 'all')}
      />

      {!isWatchPage && <PWAInstallBanner />}

      <main className="flex-1">
        {pageContent}
      </main>

      <Footer />

      {/* Mobile Bottom Navigation Bar (Hidden on watch page to match screenshot) */}
      {!isWatchPage && (
        <MobileBottomNav
          currentRoute={path}
          onNavigate={navigateTo}
          onOpenSearch={() => handleOpenSearch('', 'all')}
        />
      )}

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectMovie={handleSelectMovie}
        initialKeyword={searchInitialKeyword}
        initialScope={searchInitialScope}
      />
    </div>
  );
}

export default App;
