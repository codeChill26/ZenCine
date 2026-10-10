import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

export interface VideoPlayerRef {
  rewind: (seconds?: number) => void;
  forward: (seconds?: number) => void;
  getInstance: () => Artplayer | null;
}

interface ArtplayerProps {
  url: string;
  poster?: string;
  title?: string;
  episodeName?: string;
  startTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  className?: string;
}

function cleanEpisodeBadge(name: string): string {
  if (!name) return 'TẬP 01';
  const clean = name.trim();
  const normalized = clean
    .replace(/^tập\s*tập\s*/i, '')
    .replace(/^tập\s*/i, '')
    .trim();
  return normalized ? `TẬP ${normalized.toUpperCase()}` : 'TẬP 01';
}

export const VideoPlayer = forwardRef<VideoPlayerRef, ArtplayerProps>(({
  url,
  poster,
  title = '',
  episodeName = '',
  startTime = 0,
  onTimeUpdate,
  onEnded,
  className = '',
}, ref) => {
  const artRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Artplayer | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [gestureSide, setGestureSide] = useState<'left' | 'right' | null>(null);
  const gestureTimerRef = useRef<any>(null);

  const triggerGestureFeedback = (side: 'left' | 'right') => {
    setGestureSide(side);
    if (gestureTimerRef.current) {
      clearTimeout(gestureTimerRef.current);
    }
    gestureTimerRef.current = setTimeout(() => {
      setGestureSide(null);
    }, 600);
  };

  useImperativeHandle(ref, () => ({
    rewind: (seconds = 10) => {
      if (instanceRef.current) {
        const cur = instanceRef.current.currentTime;
        const target = Math.max(0, cur - seconds);
        instanceRef.current.seek = target;
        instanceRef.current.notice.show = `⏪ Lùi ${seconds}s`;
        triggerGestureFeedback('left');
      }
    },
    forward: (seconds = 10) => {
      if (instanceRef.current) {
        const cur = instanceRef.current.currentTime;
        const dur = instanceRef.current.duration || 999999;
        const target = Math.min(dur, cur + seconds);
        instanceRef.current.seek = target;
        instanceRef.current.notice.show = `⏩ Tua ${seconds}s`;
        triggerGestureFeedback('right');
      }
    },
    getInstance: () => instanceRef.current,
  }));

  useEffect(() => {
    if (!artRef.current || !url) return;

    // Prevent toolbar from automatically disappearing ("thanh công cụ không được bị mất")
    Artplayer.CONTROL_HIDE_TIME = 999999999;
    Artplayer.DBCLICK_FULLSCREEN = false; // Controlled via our custom double action handler
    Artplayer.MOBILE_DBCLICK_PLAY = false; // Prevent play/pause on double tap

    let hlsInstance: Hls | null = null;

    const art = new Artplayer({
      container: artRef.current,
      url: url,
      poster: poster || '',
      volume: 0.8,
      isLive: false,
      muted: false,
      autoplay: true,
      autoSize: false,
      autoMini: false,
      screenshot: false,
      setting: false,
      pip: false,
      loop: false,
      playbackRate: false,
      aspectRatio: false,
      fullscreen: true,
      fullscreenWeb: false,
      theme: '#e50914',
      lang: 'vi',
      hotkey: true,
      airplay: true,
      lock: false,
      fastForward: true,
      autoPlayback: true,
      playsInline: true,
      moreVideoAttr: {
        playsInline: true,
        'webkit-playsinline': 'true',
        'x5-playsinline': 'true',
      } as any,
      layers: [
        {
          name: 'watermark',
          html: `
            <div class="art-watermark-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M7 3v18"/>
                <path d="M3 7.5h4"/>
                <path d="M3 12h18"/>
                <path d="M3 16.5h4"/>
                <path d="M17 3v18"/>
                <path d="M17 7.5h4"/>
                <path d="M17 16.5h4"/>
              </svg>
              <span>ZenCine</span>
            </div>
          `,
          style: {
            position: 'absolute',
            top: '12px',
            right: '14px',
            zIndex: '15',
          },
        },
      ],
      controls: [
        {
          name: 'rewind10',
          position: 'left',
          index: 10,
          html: `
            <div class="art-capsule-btn" title="Lùi 10 giây">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>-10s</span>
            </div>
          `,
          click: function () {
            art.seek = Math.max(0, art.currentTime - 10);
            art.notice.show = '⏪ Lùi 10s';
            triggerGestureFeedback('left');
          },
        },
        {
          name: 'forward10',
          position: 'left',
          index: 11,
          html: `
            <div class="art-capsule-btn" title="Tua 10 giây">
              <span>+10s</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
              </svg>
            </div>
          `,
          click: function () {
            const dur = art.duration || 999999;
            art.seek = Math.min(dur, art.currentTime + 10);
            art.notice.show = '⏩ Tua 10s';
            triggerGestureFeedback('right');
          },
        },
        {
          name: 'rate',
          position: 'right',
          index: 15,
          html: `<button class="art-speed-pill-btn" title="Tốc độ phát">1x</button>`,
          click: function () {
            const rates = [1.0, 1.25, 1.5, 2.0, 0.75];
            const cur = art.playbackRate;
            const nextIdx = (rates.indexOf(cur) + 1) % rates.length;
            const nextRate = rates[nextIdx];
            art.playbackRate = nextRate;
            const pill = art.template.$controlsRight.querySelector('.art-speed-pill-btn');
            if (pill) {
              pill.textContent = `${nextRate}x`;
            }
            art.notice.show = `⚡ Tốc độ: ${nextRate}x`;
          },
        },
      ],
      customType: {
        m3u8: function (video: HTMLVideoElement, url: string, art: Artplayer) {
          if (Hls.isSupported()) {
            if (hlsInstance) {
              hlsInstance.destroy();
            }
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
            });
            hls.loadSource(url);
            hls.attachMedia(video);
            hlsInstance = hls;
            art.hls = hls;
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
          } else {
            art.notice.show = 'Trình duyệt không hỗ trợ định dạng phát video này.';
          }
        },
      },
    });

    instanceRef.current = art;

    art.on('ready', () => {
      // Setup Custom Progress Bar Row: [00:02] [--- Progress Slider ---] [62:26]
      const progress = art.template.$progress;
      if (progress && !progress.parentElement?.classList.contains('art-custom-progress-row')) {
        const row = document.createElement('div');
        row.className = 'art-custom-progress-row';

        const curTime = document.createElement('span');
        curTime.className = 'art-time-cur';
        curTime.textContent = '00:00';

        const durTime = document.createElement('span');
        durTime.className = 'art-time-dur';
        durTime.textContent = '00:00';

        progress.parentNode?.insertBefore(row, progress);
        row.appendChild(curTime);
        row.appendChild(progress);
        row.appendChild(durTime);

        const updateTimes = () => {
          curTime.textContent = Artplayer.utils.secondToTime(art.currentTime);
          durTime.textContent = Artplayer.utils.secondToTime(art.duration || 0);
        };

        art.on('video:timeupdate', updateTimes);
        art.on('video:loadedmetadata', updateTimes);
        art.on('video:durationchange', updateTimes);
      }

      // =========================================================================
      // GESTURE HANDLER:
      // 1. Double click khi chưa phóng to => Phóng to (Fullscreen)
      // 2. Double click khi đã phóng to => Bên phải tua +10s, Bên trái lùi -10s
      // =========================================================================
      const playerEl = art.template.$player;

      const handleDoubleAction = (clientX: number) => {
        const rect = playerEl.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const width = rect.width;
        const isRight = clickX > width / 2;

        const isFs = Boolean(
          art.fullscreen ||
          art.fullscreenWeb ||
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement
        );

        if (!isFs) {
          // Chưa phóng to: double click vào film thì phóng to
          art.fullscreen = true;
          art.notice.show = '⛶ Phóng to toàn màn hình';
        } else {
          // Đã phóng to rồi:
          // Double click bên phải thì tua 10s
          // Double click bên trái thì lùi 10s
          if (isRight) {
            const dur = art.duration || 999999;
            art.seek = Math.min(dur, art.currentTime + 10);
            art.notice.show = '⏩ Tua 10s';
            triggerGestureFeedback('right');
          } else {
            art.seek = Math.max(0, art.currentTime - 10);
            art.notice.show = '⏪ Lùi 10s';
            triggerGestureFeedback('left');
          }
        }
      };

      let lastTouchTriggerTime = 0;

      // Desktop Double Click
      const onDblClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.art-bottom') || target.closest('.art-controls') || target.closest('.art-progress') || target.closest('.art-control')) {
          return;
        }
        if (Date.now() - lastTouchTriggerTime < 500) {
          return; // Ignore synthesized mouse click from touch
        }
        handleDoubleAction(e.clientX);
      };

      // Mobile Touch Double Tap
      let lastTapTime = 0;
      let lastTapX = 0;
      let lastTapY = 0;

      const onTouchEnd = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.art-bottom') || target.closest('.art-controls') || target.closest('.art-progress') || target.closest('.art-control')) {
          return;
        }
        if (e.changedTouches.length === 0) return;

        const touch = e.changedTouches[0];
        const now = Date.now();
        const timeDiff = now - lastTapTime;
        const dist = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY);

        if (timeDiff > 40 && timeDiff < 320 && dist < 45) {
          lastTouchTriggerTime = now;
          lastTapTime = 0;
          handleDoubleAction(touch.clientX);
        } else {
          lastTapTime = now;
          lastTapX = touch.clientX;
          lastTapY = touch.clientY;
        }
      };

      playerEl.addEventListener('dblclick', onDblClick);
      playerEl.addEventListener('touchend', onTouchEnd, { passive: true });

      // Clean up event listeners on destroy
      art.on('destroy', () => {
        playerEl.removeEventListener('dblclick', onDblClick);
        playerEl.removeEventListener('touchend', onTouchEnd);
      });
    });

    // Keep controls permanently visible ("thanh công cụ không được bị mất")
    setControlsVisible(true);
    art.on('control', () => {
      setControlsVisible(true);
    });

    if (startTime > 10) {
      art.on('ready', () => {
        art.seek = startTime;
        art.notice.show = `Đang tiếp tục từ ${Artplayer.utils.secondToTime(startTime)}`;
      });
    }

    let lastSaved = 0;
    art.on('video:timeupdate', () => {
      const current = art.currentTime;
      const duration = art.duration || 0;
      if (Math.abs(current - lastSaved) >= 5) {
        lastSaved = current;
        onTimeUpdate?.(current, duration);
      }
    });

    art.on('video:ended', () => {
      onEnded?.();
    });

    return () => {
      if (gestureTimerRef.current) {
        clearTimeout(gestureTimerRef.current);
      }
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      if (instanceRef.current) {
        instanceRef.current.destroy(false);
      }
    };
  }, [url]);

  return (
    <div className={`relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black group ${className}`}>
      <div ref={artRef} className="w-full h-full select-none" />

      {/* Fullscreen Double-Tap Feedback Animation Overlays */}
      {gestureSide === 'left' && (
        <div className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-center bg-white/10 z-30 pointer-events-none animate-in fade-in zoom-in-90 duration-150 rounded-r-full">
          <div className="flex flex-col items-center justify-center bg-black/70 backdrop-blur-md px-5 py-3 rounded-2xl text-white border border-white/20 shadow-2xl">
            <div className="flex items-center gap-1 mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </div>
            <span className="font-extrabold text-sm tracking-wide">-10s</span>
          </div>
        </div>
      )}

      {gestureSide === 'right' && (
        <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-center bg-white/10 z-30 pointer-events-none animate-in fade-in zoom-in-90 duration-150 rounded-l-full">
          <div className="flex flex-col items-center justify-center bg-black/70 backdrop-blur-md px-5 py-3 rounded-2xl text-white border border-white/20 shadow-2xl">
            <div className="flex items-center gap-1 mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </div>
            <span className="font-extrabold text-sm tracking-wide">+10s</span>
          </div>
        </div>
      )}

      {/* Video Title and Episode Overlay (Bottom Left above progress bar) */}
      {(title || episodeName) && (
        <div
          className={`absolute bottom-[66px] sm:bottom-[74px] left-3.5 sm:left-5 z-20 pointer-events-none transition-all duration-200 ${
            controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-100'
          }`}
        >
          {episodeName && (
            <div className="mb-1">
              <span className="bg-red-600 text-white font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded shadow-lg uppercase tracking-wider inline-block">
                {cleanEpisodeBadge(episodeName)}
              </span>
            </div>
          )}
          {title && (
            <h2 className="text-base sm:text-xl lg:text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-xl truncate">
              {title}
            </h2>
          )}
        </div>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
