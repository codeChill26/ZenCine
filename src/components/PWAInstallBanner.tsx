import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Logo } from './Logo';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if window already has deferredPrompt captured from index.html
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e);
    };

    const onPromptReady = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDismissed(true);
      (window as any).deferredPrompt = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('pwa-prompt-ready', onPromptReady);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', onPromptReady);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;

    if (promptEvent) {
      try {
        // Trigger browser native install prompt directly
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          (window as any).deferredPrompt = null;
          setDismissed(true);
        }
      } catch (err) {
        console.warn('Install error, showing guide:', err);
        setShowGuideModal(true);
      }
    } else {
      // If native prompt is not directly available (e.g. iOS Safari or Chrome restrictions), show quick guide
      setShowGuideModal(true);
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      {/* Floating PWA Install Banner */}
      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] z-50 glass-panel rounded-2xl p-3.5 shadow-2xl border border-red-500/30 bg-[#0e1017]/95 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-md">
              <Logo size="sm" showText={false} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">ZenCine</h4>
              <p className="text-[11px] text-slate-400 truncate">Xem phim Full HD mượt mà, không quảng cáo</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cài Đặt</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Fallback Install Instructions Modal (For iOS Safari or Browsers without direct prompt) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm glass-panel rounded-2xl p-5 border border-white/10 bg-[#121520] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-white text-base">Cài đặt ứng dụng ZenCine</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <p className="font-bold text-white text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  Trên điện thoại Android (Chrome / Cốc Cốc):
                </p>
                <p className="text-xs text-slate-300 pl-5 leading-relaxed">
                  Bấm vào menu <strong>3 chấm (⋮)</strong> góc trên cùng bên phải trình duyệt ➔ Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <p className="font-bold text-white text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Trên iPhone / iPad (Safari):
                </p>
                <p className="text-xs text-slate-300 pl-5 leading-relaxed">
                  Bấm biểu tượng <strong>Chia sẻ (Share <ArrowUpRight className="inline w-3.5 h-3.5" />)</strong> ở thanh dưới cùng ➔ Cuộn xuống chọn <strong>"Thêm vào MH chính"</strong> (Add to Home Screen).
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wide cursor-pointer transition-all shadow-lg shadow-red-600/30"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
};
