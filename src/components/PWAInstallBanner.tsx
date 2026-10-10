import { Logo } from './Logo';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 glass-panel rounded-2xl p-3.5 shadow-2xl border border-red-500/30 bg-[#0e1017]/95 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Logo size="sm" showText={false} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Cài đặt ứng dụng ZenCine</h4>
            <p className="text-[11px] text-slate-400">Xem phim mượt mà, lưu lịch sử, không quảng cáo</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all cursor-pointer"
          >
            Cài Đặt
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
