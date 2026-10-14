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

    const handleTvKeyDown = (e: KeyboardEvent) => {
      // 461: webOS VK_BACK, 10009: Tizen VK_RETURN/BACK, Escape: 27
      if (e.keyCode === 461 || e.keyCode === 10009 || e.key === 'Escape') {
        if (searchOpen) {
          e.preventDefault();
          setSearchOpen(false);
          return;
        }
        const currentHash = window.location.hash || '#/home';
        if (currentHash !== '#/home' && currentHash !== '#home' && currentHash !== '') {
          e.preventDefault();
          const prev = sessionStorage.getItem('zen_prev_route');
          if (prev && prev !== currentHash) {
            window.location.hash = prev;
          } else {
            window.location.hash = '#/home';
          }
        }
      }
    };

    window.addEventListener('keydown', handleTvKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleTvKeyDown);
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
        onOpenSearch={() => setSearchOpen(true)}
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
          onOpenSearch={() => setSearchOpen(true)}
        />
      )}

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectMovie={handleSelectMovie}
      />
    </div>
  );
}

export default App;
