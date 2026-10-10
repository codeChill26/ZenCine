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

export function App() {
  const [route, setRoute] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return hash || 'home';
  });
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      setRoute(hash || 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (newRoute: string) => {
    window.location.hash = `/${newRoute}`;
  };

  const handleSelectMovie = (slug: string) => {
    navigateTo(`movie/${slug}`);
  };

  let pageContent: React.ReactNode = null;

  if (route.startsWith('movie/')) {
    const movieSlug = route.replace(/^movie\//, '');
    pageContent = <WatchPage movieSlug={movieSlug} onSelectMovie={handleSelectMovie} />;
  } else if (route.startsWith('type:')) {
    const typeSlug = route.replace(/^type:/, '');
    pageContent = (
      <CatalogPage
        filterType="type"
        slug={typeSlug}
        onSelectMovie={handleSelectMovie}
        onNavigate={navigateTo}
      />
    );
  } else if (route.startsWith('category:')) {
    const catSlug = route.replace(/^category:/, '');
    pageContent = (
      <CatalogPage
        filterType="category"
        slug={catSlug}
        onSelectMovie={handleSelectMovie}
        onNavigate={navigateTo}
      />
    );
  } else if (route.startsWith('country:')) {
    const countrySlug = route.replace(/^country:/, '');
    pageContent = (
      <CatalogPage
        filterType="country"
        slug={countrySlug}
        onSelectMovie={handleSelectMovie}
        onNavigate={navigateTo}
      />
    );
  } else if (route === 'history') {
    pageContent = <HistoryPage onSelectMovie={handleSelectMovie} />;
  } else if (route === 'favorites') {
    pageContent = <FavoritesPage onSelectMovie={handleSelectMovie} />;
  } else {
    pageContent = <HomePage onSelectMovie={handleSelectMovie} onNavigate={navigateTo} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c10] text-slate-100 pb-16 sm:pb-0">
      <Navbar
        currentRoute={route}
        onNavigate={navigateTo}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <PWAInstallBanner />

      <main className="flex-1">
        {pageContent}
      </main>

      <Footer />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentRoute={route}
        onNavigate={navigateTo}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectMovie={handleSelectMovie}
      />
    </div>
  );
}

export default App;
