import React, { useState, useEffect } from 'react';
import { X, Download, Zap, ShieldCheck, Maximize, Smartphone, Share2, PlusSquare } from 'lucide-react';
import { Logo } from './Logo';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (already installed as app)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if user already dismissed the first-time modal in this session
    const hasSeenPrompt = sessionStorage.getItem('zencine_pwa_dismissed');

    if (!hasSeenPrompt) {
      // Show popup after 1.5 seconds for first-time visitors
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsOpen(false);
      }
    } else if (!isIOS) {
      // Fallback instruction for Android/Desktop if beforeinstallprompt already fired
      alert('Để cài đặt ZenCine, bạn hãy bấm vào biểu tượng 3 dấu chấm (⋮) ở góc trên trình duyệt và chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".');
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('zencine_pwa_dismissed', 'true');
  };

  if (!isOpen || installed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-md glass-panel rounded-3xl overflow-hidden p-6 sm:p-7 border border-red-500/30 shadow-2xl bg-[#0e111a]/95 text-center space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-red-600/30 rounded-full blur-2xl pointer-events-none" />

        {/* Logo Emblem Header */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 shadow-xl mb-3">
            <Logo size="lg" showText={false} />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Cài Đặt Ứng Dụng ZenCine
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
            Trải nghiệm rạp phim mượt mà ngay trên màn hình chính
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 gap-2.5 text-left text-xs bg-black/40 p-3.5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white">Tốc độ mở siêu nhanh:</span>
              <p className="text-slate-400 text-[11px]">Không giật lag, tải luồng phát Full HD tức thì.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white">100% Không quảng cáo rác:</span>
              <p className="text-slate-400 text-[11px]">Không chứa pop-up chuyển hướng gây khó chịu.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Maximize className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white">Toàn màn hình không viền:</span>
              <p className="text-slate-400 text-[11px]">Trải nghiệm như ứng dụng gốc, ẩn thanh URL.</p>
            </div>
          </div>
        </div>

        {/* Instructions / Action Area */}
        {isIOS ? (
          // iOS Safari Step-by-Step Guide
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left text-xs space-y-2 text-slate-200">
            <p className="font-bold text-amber-400 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              Cách cài trên iPhone / iPad (Safari):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
              <li className="flex items-center gap-1.5">
                <span>1. Bấm nút</span>
                <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Share2 className="w-3 h-3 text-cyan-400 inline" /> Chia sẻ
                </span>
                <span>ở đáy Safari.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>2. Chọn</span>
                <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <PlusSquare className="w-3 h-3 text-emerald-400 inline" /> Thêm vào MH chính
                </span>
              </li>
              <li>3. Bấm <b>Thêm (Add)</b> để hoàn tất.</li>
            </ol>
            <button
              onClick={handleDismiss}
              className="w-full mt-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Tôi Đã Hiểu
            </button>
          </div>
        ) : (
          // Android / Chrome / Desktop One-Click Install Button
          <div className="space-y-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm tracking-wide shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Cài Đặt Ngay (Miễn Phí)</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-slate-400 hover:text-slate-200 font-medium py-1 transition-colors cursor-pointer"
            >
              Để sau, tiếp tục xem trên web
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
