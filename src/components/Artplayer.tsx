import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { Layers, Clapperboard, X, Play } from 'lucide-react';
import type { EpisodeServer, EpisodeData } from '../types/movie';

export interface VideoPlayerRef {
  rewind: (seconds?: number) => void;
  forward: (seconds?: number) => void;
  toggleFullscreen: (target?: boolean) => void;
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
  episodes?: EpisodeServer[];
  currentServer?: number;
  currentEpisode?: EpisodeData | null;
  onSelectEpisode?: (serverIdx: number, ep: EpisodeData) => void;
  nextEpisode?: EpisodeData | null;
  onNextEpisode?: () => void;
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

function cleanEpisodeText(name?: string): string {
  if (!name) return 'Tập 01';
  const clean = name.trim();
  const num = clean.replace(/^tập\s*tập\s*/i, '').replace(/^tập\s*/i, '').trim();
  if (!num) return 'Tập 01';
  if (num.toLowerCase() === 'full') return 'Tập Full';
  return `Tập ${num}`;
}

// Khóa xoay ngang màn hình (Hỗ trợ Capacitor Plugin + Web Screen Orientation API)
async function lockLandscape(): Promise<boolean> {
  // 1. Thử qua Capacitor ScreenOrientation nếu đang chạy trong app native / APK
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.lock({ orientation: 'landscape' });
    return true;
  } catch {}

  // 2. Thử qua Web Screen Orientation API tiêu chuẩn trên Chrome/Android/PWA
  try {
    const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape');
      return true;
    } else if ((screen as any).lockOrientation) {
      return Boolean((screen as any).lockOrientation('landscape'));
    }
  } catch {}

  return false;
}

// Mở khóa xoay màn hình khi thoát toàn màn hình
async function unlockOrientation(): Promise<void> {
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.unlock().catch(() => {});
  } catch {}

  try {
    const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
    if (orientation && typeof orientation.unlock === 'function') {
      orientation.unlock();
    } else if ((screen as any).unlockOrientation) {
      (screen as any).unlockOrientation();
    }
  } catch {}
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
  episodes,
  currentServer = 0,
  currentEpisode,
  onSelectEpisode,
  nextEpisode,
  onNextEpisode,
}, ref) => {
  const artRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Artplayer | null>(null);
  const [isSimulatedLandscapeState, setIsSimulatedLandscapeState] = useState(false);
  const triggerGestureDomRef = useRef<((side: 'left' | 'right' | 'center', text?: string, iconSvg?: string) => void) | null>(null);
  const toggleFullscreenRef = useRef<((target?: boolean) => void) | null>(null);

  // States cho In-Player Episode Drawer & Next Episode Popup
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [showNextEpisodePopup, setShowNextEpisodePopup] = useState(false);
  const [nextEpCountdown, setNextEpCountdown] = useState(15);
  const [dismissedEpSlug, setDismissedEpSlug] = useState<string | null>(null);
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [drawerServerIdx, setDrawerServerIdx] = useState(currentServer || 0);

  const isDrawerOpenRef = useRef(false);
  isDrawerOpenRef.current = isEpisodeDrawerOpen;

  const nextEpisodeRef = useRef(nextEpisode);
  nextEpisodeRef.current = nextEpisode;

  const onNextEpisodeRef = useRef(onNextEpisode);
  onNextEpisodeRef.current = onNextEpisode;

  const currentEpisodeRef = useRef(currentEpisode);
  currentEpisodeRef.current = currentEpisode;

  const dismissedEpSlugRef = useRef(dismissedEpSlug);
  dismissedEpSlugRef.current = dismissedEpSlug;

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const activeEpBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setDrawerServerIdx(currentServer || 0);
  }, [currentServer]);

  useEffect(() => {
    setShowNextEpisodePopup(false);
    setIsEpisodeDrawerOpen(false);
  }, [url]);

  // Bộ đếm lùi tự động phát tập tiếp theo khi hiển thị popup
  useEffect(() => {
    if (!showNextEpisodePopup) return;
    const timer = setInterval(() => {
      setNextEpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowNextEpisodePopup(false);
          onNextEpisode?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showNextEpisodePopup, onNextEpisode]);

  // Tự động cuộn đến tập đang phát khi mở drawer chọn tập
  useEffect(() => {
    if (isEpisodeDrawerOpen) {
      const timer = setTimeout(() => {
        if (activeEpBtnRef.current) {
          activeEpBtnRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          try {
            activeEpBtnRef.current.focus({ preventScroll: true });
          } catch {}
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isEpisodeDrawerOpen]);

  // Đóng drawer khi người dùng bấm phím Back trên remote TV
  useEffect(() => {
    const handleCloseDrawer = () => {
      setIsEpisodeDrawerOpen(false);
    };
    window.addEventListener('zen-close-ep-drawer', handleCloseDrawer);
    return () => {
      window.removeEventListener('zen-close-ep-drawer', handleCloseDrawer);
    };
  }, []);

  const triggerGestureFeedback = (side: 'left' | 'right' | 'center', text?: string, iconSvg?: string) => {
    triggerGestureDomRef.current?.(side, text, iconSvg);
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
    toggleFullscreen: (target?: boolean) => {
      toggleFullscreenRef.current?.(target);
    },
    getInstance: () => instanceRef.current,
  }));

  useEffect(() => {
    if (!artRef.current || !url) return;

    // Auto-hide controls after 3s of inactivity when playing
    Artplayer.CONTROL_HIDE_TIME = 3000;
    Artplayer.DBCLICK_TIME = 0; // Managed via our custom gesture handler
    Artplayer.DBCLICK_FULLSCREEN = false; // Managed via our custom gesture handler
    Artplayer.MOBILE_DBCLICK_PLAY = false; // Prevent play/pause on double tap
    Artplayer.MOBILE_CLICK_PLAY = false; // Prevent unwanted play/pause on tap

    let hlsInstance: Hls | null = null;

    const safeTitle = (title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeEp = episodeName ? cleanEpisodeBadge(episodeName) : '';

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
      fullscreen: false, // Dùng nút custom fullscreen để tự động xoay ngang điện thoại chuẩn xác
      fullscreenWeb: false,
      theme: '#e50914',
      lang: 'vi',
      hotkey: false,
      airplay: true,
      lock: false,
      fastForward: false,
      gesture: false,
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
            top: '14px',
            left: '16px',
            zIndex: '15',
          },
        },
        {
          name: 'titleOverlay',
          html: `
            <div class="art-title-layer">
              ${safeEp ? `<div class="art-title-badge-wrap"><span class="art-title-badge">${safeEp}</span></div>` : ''}
              ${safeTitle ? `<h2 class="art-title-text">${safeTitle}</h2>` : ''}
            </div>
          `,
          style: {
            position: 'absolute',
            bottom: '72px',
            left: '16px',
            zIndex: '20',
            pointerEvents: 'none',
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
        {
          name: 'fullscreenCustom',
          position: 'right',
          index: 70,
          html: `
            <div class="art-custom-fs-btn" title="Toàn màn hình">
              <svg class="art-icon-fs-enter" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
              <svg class="art-icon-fs-exit" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            </div>
          `,
          click: function () {
            toggleFullscreenRef.current?.();
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

    const host = document.createElement('div');
    host.className = 'zen-player-portal-host';
    if (art.template?.$player) {
      art.template.$player.appendChild(host);
      setPortalHost(host);
    }

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
      // GESTURE & OVERLAYS:
      // =========================================================================
      const playerEl = art.template.$player;

      // Double tap / double click feedback overlay in player DOM
      const leftOverlay = document.createElement('div');
      leftOverlay.className = 'art-gesture-overlay art-gesture-left';
      leftOverlay.innerHTML = `
        <div class="art-gesture-badge">
          <div class="art-gesture-icons">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </div>
          <span>-10s</span>
        </div>
      `;

      const rightOverlay = document.createElement('div');
      rightOverlay.className = 'art-gesture-overlay art-gesture-right';
      rightOverlay.innerHTML = `
        <div class="art-gesture-badge">
          <div class="art-gesture-icons">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </div>
          <span>+10s</span>
        </div>
      `;

      const centerOverlay = document.createElement('div');
      centerOverlay.className = 'art-gesture-overlay art-gesture-center';
      centerOverlay.innerHTML = `
        <div class="art-gesture-badge">
          <div class="art-gesture-icons">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </div>
          <span class="art-center-text">Phóng to</span>
        </div>
      `;

      playerEl.appendChild(leftOverlay);
      playerEl.appendChild(rightOverlay);
      playerEl.appendChild(centerOverlay);

      // Fast-forward 2x speed badge overlay (Hold right side like Facebook / YouTube)
      const speed2xOverlay = document.createElement('div');
      speed2xOverlay.className = 'art-speed2x-badge';
      speed2xOverlay.innerHTML = `
        <div class="art-speed2x-inner">
          <span class="art-speed2x-icon">⚡</span>
          <span class="art-speed2x-text">Tua nhanh 2X</span>
          <span class="art-speed2x-arrows">>></span>
        </div>
      `;
      playerEl.appendChild(speed2xOverlay);

      let animTimeout: any = null;
      triggerGestureDomRef.current = (side: 'left' | 'right' | 'center', text?: string, iconSvg?: string) => {
        const targetEl = side === 'left' ? leftOverlay : side === 'right' ? rightOverlay : centerOverlay;
        leftOverlay.classList.remove('art-gesture-active');
        rightOverlay.classList.remove('art-gesture-active');
        centerOverlay.classList.remove('art-gesture-active');

        if (side === 'center') {
          if (text) {
            const span = centerOverlay.querySelector('.art-center-text');
            if (span) span.textContent = text;
          }
          if (iconSvg) {
            const iconContainer = centerOverlay.querySelector('.art-gesture-icons');
            if (iconContainer) iconContainer.innerHTML = iconSvg;
          }
        }

        void targetEl.offsetWidth; // Force CSS reflow to restart animation
        targetEl.classList.add('art-gesture-active');

        if (animTimeout) clearTimeout(animTimeout);
        animTimeout = setTimeout(() => {
          targetEl.classList.remove('art-gesture-active');
        }, 600);
      };

      // Auto-hide toolbar controller
      let hideControlsTimer: any = null;
      let isBottomHovered = false;

      const hideToolbar = (force = false) => {
        if (!force && (art.video.paused || isBottomHovered || isDrawerOpenRef.current)) return;
        playerEl.classList.add('art-controls-hidden');
        art.controls.show = false;
        setIsControlsVisible(false);
      };

      const showToolbar = (autoHide = true) => {
        if (hideControlsTimer) {
          clearTimeout(hideControlsTimer);
          hideControlsTimer = null;
        }
        playerEl.classList.remove('art-controls-hidden');
        art.controls.show = true;
        setIsControlsVisible(true);

        if (autoHide && !art.video.paused && !isBottomHovered && !isDrawerOpenRef.current) {
          hideControlsTimer = setTimeout(() => {
            hideToolbar();
          }, 3500);
        }
      };

      // Click màn hình: Play / Pause tiện lợi
      const togglePlayPause = () => {
        if (hasTriggeredLongPress) return;
        if (art.video.paused) {
          art.play();
          triggerGestureFeedback(
            'center',
            'Phát',
            `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
          );
        } else {
          art.pause();
          triggerGestureFeedback(
            'center',
            'Tạm dừng',
            `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
          );
        }
        showToolbar(true);
      };

      // =========================================================================
      // FULLSCREEN & AUTO ROTATE LANDSCAPE MANAGEMENT
      // =========================================================================
      let isSimulatedLandscape = false;
      let isManualFullscreen = false;

      const isCurrentlyFullscreen = () => {
        return Boolean(
          playerEl.classList.contains('art-fullscreen') ||
          document.fullscreenElement === playerEl ||
          (document as any).webkitFullscreenElement === playerEl ||
          isSimulatedLandscape
        );
      };

      const updateFullscreenIcons = (isFs: boolean) => {
        const enterIcon = art.template.$controlsRight?.querySelector('.art-icon-fs-enter') as HTMLElement | null;
        const exitIcon = art.template.$controlsRight?.querySelector('.art-icon-fs-exit') as HTMLElement | null;
        const btn = art.template.$controlsRight?.querySelector('.art-custom-fs-btn') as HTMLElement | null;

        if (enterIcon && exitIcon) {
          if (isFs) {
            enterIcon.style.display = 'none';
            exitIcon.style.display = 'inline-flex';
            if (btn) btn.title = 'Thu nhỏ màn hình';
          } else {
            enterIcon.style.display = 'inline-flex';
            exitIcon.style.display = 'none';
            if (btn) btn.title = 'Toàn màn hình';
          }
        }

        if (isFs) {
          playerEl.classList.add('art-fullscreen');
          document.body.classList.add('zen-player-fullscreen-active');
        } else {
          playerEl.classList.remove('art-fullscreen');
          document.body.classList.remove('zen-player-fullscreen-active');
        }

        art.emit('fullscreen', isFs);
      };

      const enableSimulatedLandscape = () => {
        if (isSimulatedLandscape) return;
        isSimulatedLandscape = true;
        playerEl.classList.add('art-simulated-landscape');
        document.body.classList.add('zen-simulated-landscape-active');
        setIsSimulatedLandscapeState(true);
        updateFullscreenIcons(true);
        setTimeout(() => art.emit('resize'), 80);
      };

      const disableSimulatedLandscape = () => {
        if (!isSimulatedLandscape) return;
        isSimulatedLandscape = false;
        playerEl.classList.remove('art-simulated-landscape');
        document.body.classList.remove('zen-simulated-landscape-active');
        setIsSimulatedLandscapeState(false);
        updateFullscreenIcons(isCurrentlyFullscreen());
        setTimeout(() => art.emit('resize'), 80);
      };

      const enterLandscapeFullscreen = async () => {
        isManualFullscreen = true;
        const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

        // 1. Áp dụng ngay giao diện toàn màn hình 100vw x 100vh
        playerEl.classList.add('art-fullscreen');
        document.body.classList.add('zen-player-fullscreen-active');
        updateFullscreenIcons(true);

        // 2. Kích hoạt khóa xoay ngang màn hình
        lockLandscape().catch(() => {});

        // 3. Yêu cầu toàn màn hình phần tử trình phát (nếu WebView hỗ trợ)
        try {
          if (playerEl.requestFullscreen) {
            await playerEl.requestFullscreen({ navigationUI: 'hide' });
          } else if ((playerEl as any).webkitRequestFullscreen) {
            await (playerEl as any).webkitRequestFullscreen();
          }
        } catch (_) {}

        lockLandscape().catch(() => {});

        // 4. Với điện thoại: Nếu hệ thống không tự xoay ngang, bật xoay ngang giả lập CSS 90 độ
        if (isTouch) {
          setTimeout(() => {
            const isNowLandscape = window.innerWidth > window.innerHeight;
            if (!isNowLandscape) {
              enableSimulatedLandscape();
            } else {
              disableSimulatedLandscape();
            }
            updateFullscreenIcons(true);
            art.emit('resize');
          }, 180);
        } else {
          updateFullscreenIcons(true);
          art.emit('resize');
        }

        art.notice.show = '⛶ Toàn màn hình';
      };

      const exitLandscapeFullscreen = async () => {
        isManualFullscreen = false;
        playerEl.classList.remove('art-fullscreen');
        document.body.classList.remove('zen-player-fullscreen-active');
        disableSimulatedLandscape();

        try {
          if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
            if (document.exitFullscreen) {
              await document.exitFullscreen().catch(() => {});
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen().catch(() => {});
            }
          }
        } catch (_) {}

        unlockOrientation().catch(() => {});
        updateFullscreenIcons(false);
        art.emit('resize');
        art.notice.show = '⛶ Thu nhỏ màn hình';
      };

      const toggleLandscapeFullscreen = (target?: boolean) => {
        const current = isCurrentlyFullscreen();
        const willBe = target !== undefined ? target : !current;
        if (willBe) {
          enterLandscapeFullscreen();
        } else {
          exitLandscapeFullscreen();
        }
      };

      toggleFullscreenRef.current = toggleLandscapeFullscreen;

      // Long-press fast forward 2X (Hold right side like Facebook / YouTube)
      let longPressTimer: any = null;
      let isLongPress2xActive = false;
      let pre2xPlaybackRate = 1.0;
      let hasTriggeredLongPress = false;

      const startLongPress = (clientX: number, clientY: number) => {
        const rect = playerEl.getBoundingClientRect();
        // Khi xoay ngang giả lập (90 độ), trục tiến độ video chạy dọc theo clientY của điện thoại
        const pos = isSimulatedLandscape ? (clientY - rect.top) : (clientX - rect.left);
        const dimension = isSimulatedLandscape ? rect.height : rect.width;

        // Bấm giữ ở nửa bên phải video
        if (pos > dimension * 0.45) {
          if (longPressTimer) clearTimeout(longPressTimer);
          longPressTimer = setTimeout(() => {
            if (art.video && !art.video.paused) {
              isLongPress2xActive = true;
              hasTriggeredLongPress = true;
              pre2xPlaybackRate = art.playbackRate || 1.0;
              art.playbackRate = 2.0;
              speed2xOverlay.classList.add('art-speed2x-active');
              if (navigator.vibrate) {
                try { navigator.vibrate(35); } catch {}
              }
            }
          }, 320);
        }
      };

      const stopLongPress = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (isLongPress2xActive) {
          isLongPress2xActive = false;
          art.playbackRate = pre2xPlaybackRate || 1.0;
          speed2xOverlay.classList.remove('art-speed2x-active');
          setTimeout(() => {
            hasTriggeredLongPress = false;
          }, 200);
        }
      };

      // Handle Double Click / Tap action based on horizontal screen zone
      const handleDoubleAction = (clientX: number, clientY: number) => {
        const rect = playerEl.getBoundingClientRect();
        // Khi xoay ngang giả lập (90 độ), trục trái/phải của video tương ứng với trục dọc điện thoại
        const pos = isSimulatedLandscape ? (clientY - rect.top) : (clientX - rect.left);
        const dimension = isSimulatedLandscape ? rect.height : rect.width;

        const leftZone = dimension * 0.38;
        const rightZone = dimension * 0.62;

        if (pos > rightZone) {
          // Double click / tap bên phải => Tua tới 10s
          const dur = art.duration || 999999;
          art.seek = Math.min(dur, art.currentTime + 10);
          art.notice.show = '⏩ Tua 10s';
          triggerGestureFeedback('right');
        } else if (pos < leftZone) {
          // Double click / tap bên trái => Tua lùi 10s
          art.seek = Math.max(0, art.currentTime - 10);
          art.notice.show = '⏪ Lùi 10s';
          triggerGestureFeedback('left');
        } else {
          // Double click / tap màn hình (vùng giữa) => Phóng to ra / Thu nhỏ
          toggleLandscapeFullscreen();
        }
      };

      // Mobile Touch Interaction
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let lastTouchTapTime = 0;
      let lastTouchTapX = 0;
      let lastTouchTapY = 0;
      let touchSingleTapTimer: any = null;

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
          touchStartTime = Date.now();
          startLongPress(touch.clientX, touch.clientY);
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        stopLongPress();

        const target = e.target as HTMLElement;
        if (
          target.closest('.art-bottom') ||
          target.closest('.art-controls') ||
          target.closest('.art-custom-progress-row') ||
          target.closest('.art-progress') ||
          target.closest('.art-control') ||
          target.closest('.art-custom-fs-btn') ||
          target.closest('.art-capsule-btn') ||
          target.closest('.art-speed-pill-btn') ||
          target.closest('.art-control-playAndPause') ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('.art-watermark-badge') ||
          target.closest('.art-setting') ||
          target.closest('.art-settings')
        ) {
          return;
        }

        if (e.changedTouches.length === 0) return;
        const touch = e.changedTouches[0];
        const moveDist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY);
        const touchDuration = Date.now() - touchStartTime;

        if (hasTriggeredLongPress || touchDuration > 380 || moveDist > 20) {
          if (e.cancelable) e.preventDefault();
          return;
        }

        const now = Date.now();
        const tapInterval = now - lastTouchTapTime;
        const tapDist = Math.hypot(touch.clientX - lastTouchTapX, touch.clientY - lastTouchTapY);

        if (tapInterval < 380 && tapDist < 55) {
          // Double Tap trên điện thoại
          if (touchSingleTapTimer) {
            clearTimeout(touchSingleTapTimer);
            touchSingleTapTimer = null;
          }
          lastTouchTapTime = 0;
          handleDoubleAction(touch.clientX, touch.clientY);
          showToolbar(true);
        } else {
          // Single Tap: Bấm là Play / Pause
          lastTouchTapTime = now;
          lastTouchTapX = touch.clientX;
          lastTouchTapY = touch.clientY;

          if (touchSingleTapTimer) {
            clearTimeout(touchSingleTapTimer);
          }
          touchSingleTapTimer = setTimeout(() => {
            touchSingleTapTimer = null;
            lastTouchTapTime = 0;
            togglePlayPause();
          }, 280);
        }
      };

      const onTouchCancel = () => {
        stopLongPress();
      };

      // Desktop Click & Hold Interaction
      let lastDesktopClickTime = 0;
      let lastDesktopClickX = 0;
      let lastDesktopClickY = 0;
      let desktopSingleClickTimer: any = null;

      const onMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          target.closest('.art-bottom') ||
          target.closest('.art-controls') ||
          target.closest('.art-custom-progress-row') ||
          target.closest('.art-progress') ||
          target.closest('.art-control') ||
          target.closest('.art-watermark-badge') ||
          target.closest('.zen-player-portal-host') ||
          target.closest('.zen-ep-toggle-btn') ||
          target.closest('.zen-episode-drawer') ||
          target.closest('.zen-next-ep-popup')
        ) {
          return;
        }
        if (e.button === 0) { // Chuột trái bấm giữ
          startLongPress(e.clientX, e.clientY);
        }
      };

      const onMouseUp = () => {
        stopLongPress();
      };

      const onPlayerClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          target.closest('.art-bottom') ||
          target.closest('.art-controls') ||
          target.closest('.art-custom-progress-row') ||
          target.closest('.art-progress') ||
          target.closest('.art-control') ||
          target.closest('.art-custom-fs-btn') ||
          target.closest('.art-capsule-btn') ||
          target.closest('.art-speed-pill-btn') ||
          target.closest('.art-control-playAndPause') ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('.art-watermark-badge') ||
          target.closest('.art-setting') ||
          target.closest('.art-settings') ||
          target.closest('.zen-player-portal-host') ||
          target.closest('.zen-ep-toggle-btn') ||
          target.closest('.zen-episode-drawer') ||
          target.closest('.zen-next-ep-popup') ||
          target.closest('.zen-ep-item-btn') ||
          target.closest('.zen-next-ep-btn')
        ) {
          return;
        }

        if (hasTriggeredLongPress) {
          return;
        }

        const now = Date.now();
        const clickInterval = now - lastDesktopClickTime;
        const clickDist = Math.hypot(e.clientX - lastDesktopClickX, e.clientY - lastDesktopClickY);

        if (clickInterval < 320 && clickDist < 45) {
          // Double Click: Phóng to hoặc tua
          if (desktopSingleClickTimer) {
            clearTimeout(desktopSingleClickTimer);
            desktopSingleClickTimer = null;
          }
          lastDesktopClickTime = 0;
          handleDoubleAction(e.clientX, e.clientY);
          showToolbar(true);
        } else {
          // Single Click: Xử lý thông minh và phản hồi nhanh cho Air Mouse
          lastDesktopClickTime = now;
          lastDesktopClickX = e.clientX;
          lastDesktopClickY = e.clientY;

          if (desktopSingleClickTimer) {
            clearTimeout(desktopSingleClickTimer);
          }
          desktopSingleClickTimer = setTimeout(() => {
            desktopSingleClickTimer = null;
            lastDesktopClickTime = 0;
            togglePlayPause();
          }, 180);
        }
      };

      // Di chuyển chuột trên Desktop/TV: Throttle 80ms để mượt mà khi rê chuột bay
      let lastMouseMoveTime = 0;
      const onMouseMove = () => {
        const now = Date.now();
        if (now - lastMouseMoveTime > 80) {
          lastMouseMoveTime = now;
          showToolbar(true);
          setIsControlsVisible(true);
        }
      };

      // Khi chuột rời khỏi khung player, tự động ẩn sau 1 giây
      const onMouseLeave = () => {
        stopLongPress();
        if (!art.video.paused && !isDrawerOpenRef.current) {
          if (hideControlsTimer) clearTimeout(hideControlsTimer);
          hideControlsTimer = setTimeout(() => {
            hideToolbar();
          }, 1000);
        }
      };

      // Giữ thanh công cụ luôn hiện khi chuột đang hover trong khu vực điều khiển hoặc drawer
      const bottomEl = art.template.$bottom;
      const onBottomMouseEnter = () => {
        isBottomHovered = true;
        if (hideControlsTimer) {
          clearTimeout(hideControlsTimer);
          hideControlsTimer = null;
        }
      };

      const onBottomMouseLeave = () => {
        isBottomHovered = false;
        if (!art.video.paused && !isDrawerOpenRef.current) {
          showToolbar(true);
        }
      };

      const onBottomTouchStart = () => {
        if (hideControlsTimer) {
          clearTimeout(hideControlsTimer);
          hideControlsTimer = null;
        }
      };

      const onBottomTouchEnd = () => {
        if (!art.video.paused && !isDrawerOpenRef.current) {
          if (hideControlsTimer) clearTimeout(hideControlsTimer);
          hideControlsTimer = setTimeout(() => {
            hideToolbar();
          }, 3000);
        }
      };

      playerEl.addEventListener('click', onPlayerClick, false);
      playerEl.addEventListener('mousedown', onMouseDown);
      playerEl.addEventListener('mouseup', onMouseUp);
      playerEl.addEventListener('touchstart', onTouchStart, { passive: true });
      playerEl.addEventListener('touchend', onTouchEnd, { passive: false });
      playerEl.addEventListener('touchcancel', onTouchCancel);
      playerEl.addEventListener('mousemove', onMouseMove);
      playerEl.addEventListener('mouseleave', onMouseLeave);
      bottomEl?.addEventListener('mouseenter', onBottomMouseEnter);
      bottomEl?.addEventListener('mouseleave', onBottomMouseLeave);
      bottomEl?.addEventListener('touchstart', onBottomTouchStart, { passive: true });
      bottomEl?.addEventListener('touchend', onBottomTouchEnd, { passive: true });
      host?.addEventListener('mouseenter', onBottomMouseEnter);
      host?.addEventListener('mouseleave', onBottomMouseLeave);

      // Lắng nghe thoát toàn màn hình native (Esc trên bàn phím hoặc nút Back trên Android)
      const onNativeFullscreenChange = () => {
        const isNativeFs = Boolean(
          document.fullscreenElement === playerEl ||
          (document as any).webkitFullscreenElement === playerEl
        );
        if (!isNativeFs && !isSimulatedLandscape) {
          exitLandscapeFullscreen();
        }
      };

      document.addEventListener('fullscreenchange', onNativeFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onNativeFullscreenChange);

      // Tự động xoay ngang vào Fullscreen khi điện thoại được xoay ngang vật lý
      let lastWasLandscape = window.innerWidth > window.innerHeight;

      const handleAutoRotate = () => {
        const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (!isTouchDevice) return;

        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape !== lastWasLandscape) {
          lastWasLandscape = isLandscape;

          if (isLandscape) {
            // Điện thoại đã được xoay ngang vật lý
            disableSimulatedLandscape();
            if (!isCurrentlyFullscreen()) {
              enterLandscapeFullscreen();
            }
          } else {
            // Điện thoại được dựng dọc trở lại
            if (!isManualFullscreen) {
              // Nếu trước đó vào toàn màn hình do cảm biến xoay, thì tự thoát khi dựng dọc
              exitLandscapeFullscreen();
            } else {
              // Nếu người dùng chủ động bấm "Mở to", chuyển sang xoay ngang giả lập CSS để giữ trải nghiệm rộng
              enableSimulatedLandscape();
            }
          }
          art.emit('resize');
        }
      };

      window.addEventListener('resize', handleAutoRotate);
      window.addEventListener('orientationchange', handleAutoRotate);

      // Xử lý các phím Media chuyên biệt từ Remote TV Sony/Google TV
      const handleTvMediaPlay = () => {
        if (!art.playing) art.play();
        art.notice.show = '▶ Đang phát';
        showToolbar(true);
      };

      const handleTvMediaPause = () => {
        if (art.playing) art.pause();
        art.notice.show = '⏸ Đã tạm dừng';
        showToolbar(true);
      };

      const handleTvMediaPlayPause = () => {
        togglePlayPause();
        showToolbar(true);
      };

      const handleTvMediaRewind = () => {
        const cur = art.video.currentTime || 0;
        art.seek = Math.max(0, cur - 10);
        art.notice.show = '⏪ Lùi 10s';
        triggerGestureFeedback('left');
        showToolbar(true);
      };

      const handleTvMediaFastForward = () => {
        const cur = art.video.currentTime || 0;
        const dur = art.video.duration || 999999;
        art.seek = Math.min(dur, cur + 10);
        art.notice.show = '⏩ Tua 10s';
        triggerGestureFeedback('right');
        showToolbar(true);
      };

      const handleTvExitFullscreen = () => {
        if (isCurrentlyFullscreen()) {
          exitLandscapeFullscreen();
        }
      };

      window.addEventListener('tv-media-play', handleTvMediaPlay);
      window.addEventListener('tv-media-pause', handleTvMediaPause);
      window.addEventListener('tv-media-playpause', handleTvMediaPlayPause);
      window.addEventListener('tv-media-rewind', handleTvMediaRewind);
      window.addEventListener('tv-media-fastforward', handleTvMediaFastForward);
      window.addEventListener('tv-exit-fullscreen', handleTvExitFullscreen);

      // Cấu hình MediaSession để Android TV nhận diện app phát media và chuyển phím cứng Play/Pause vào app
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', handleTvMediaPlay);
          navigator.mediaSession.setActionHandler('pause', handleTvMediaPause);
          navigator.mediaSession.setActionHandler('seekforward', handleTvMediaFastForward);
          navigator.mediaSession.setActionHandler('seekbackward', handleTvMediaRewind);
        } catch {
          // Ignore unsupported media session actions
        }
      }

      // Phím tắt bàn phím & Hàng phím cứng Media ở dưới của Remote TV:
      // TUYỆT ĐỐI KHÔNG CHẶN D-PAD (Lên, Xuống, Trái, Phải, Nút giữa OK) để người dùng tự do di chuyển menu & chọn tập!
      const onKeyDown = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

        // F: Phóng to / Thu nhỏ toàn màn hình
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          toggleLandscapeFullscreen();
          return;
        }

        // Nút Play chuyên biệt (▶) trên Remote TV Sony / Google TV / Android TV Box
        if (e.key === 'MediaPlay' || e.keyCode === 126 || e.keyCode === 250 || e.keyCode === 415) {
          e.preventDefault();
          handleTvMediaPlay();
          return;
        }

        // Nút Pause chuyên biệt (||) trên Remote TV
        if (e.key === 'MediaPause' || e.keyCode === 127 || e.keyCode === 19) {
          e.preventDefault();
          handleTvMediaPause();
          return;
        }

        // Nút Stop trên Remote TV
        if (e.key === 'MediaStop' || e.keyCode === 86 || e.keyCode === 178) {
          e.preventDefault();
          handleTvMediaPause();
          return;
        }

        // Nút gộp Play/Pause trên Remote TV (KEYCODE_MEDIA_PLAY_PAUSE: 85, 179)
        if (e.key === 'MediaPlayPause' || e.keyCode === 85 || e.keyCode === 179) {
          e.preventDefault();
          handleTvMediaPlayPause();
          return;
        }

        // Nút Tua lùi chuyên biệt `<<` ở hàng dưới (KEYCODE_MEDIA_REWIND: 89, 227, 412)
        if (e.key === 'MediaRewind' || e.keyCode === 89 || e.keyCode === 227 || e.keyCode === 412) {
          e.preventDefault();
          handleTvMediaRewind();
          return;
        }

        // Nút Tua tới chuyên biệt `>>` ở hàng dưới (KEYCODE_MEDIA_FAST_FORWARD: 90, 228, 417)
        if (e.key === 'MediaFastForward' || e.keyCode === 90 || e.keyCode === 228 || e.keyCode === 417) {
          e.preventDefault();
          handleTvMediaFastForward();
          return;
        }

        // Nút Back / Escape khi đang toàn màn hình: Thoát toàn màn hình trước
        if (e.key === 'Escape' || e.keyCode === 27 || e.keyCode === 4 || e.keyCode === 461 || e.keyCode === 10009) {
          if (isCurrentlyFullscreen() || isSimulatedLandscape) {
            e.preventDefault();
            e.stopPropagation();
            exitLandscapeFullscreen();
          }
        }
      };
      window.addEventListener('keydown', onKeyDown);

      art.on('video:play', () => {
        showToolbar(true);
      });

      art.on('video:playing', () => {
        showToolbar(true);
      });

      art.on('video:pause', () => {
        showToolbar(false);
      });

      art.on('video:waiting', () => {
        showToolbar(false);
      });

      // Clean up event listeners on destroy
      art.on('destroy', () => {
        playerEl.removeEventListener('click', onPlayerClick, true);
        playerEl.removeEventListener('mousedown', onMouseDown);
        playerEl.removeEventListener('mouseup', onMouseUp);
        playerEl.removeEventListener('touchstart', onTouchStart);
        playerEl.removeEventListener('touchend', onTouchEnd);
        playerEl.removeEventListener('touchcancel', onTouchCancel);
        playerEl.removeEventListener('mousemove', onMouseMove);
        playerEl.removeEventListener('mouseleave', onMouseLeave);
        bottomEl?.removeEventListener('mouseenter', onBottomMouseEnter);
        bottomEl?.removeEventListener('mouseleave', onBottomMouseLeave);
        bottomEl?.removeEventListener('touchstart', onBottomTouchStart);
        bottomEl?.removeEventListener('touchend', onBottomTouchEnd);
        document.removeEventListener('fullscreenchange', onNativeFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onNativeFullscreenChange);
        window.removeEventListener('resize', handleAutoRotate);
        window.removeEventListener('orientationchange', handleAutoRotate);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('tv-media-play', handleTvMediaPlay);
        window.removeEventListener('tv-media-pause', handleTvMediaPause);
        window.removeEventListener('tv-media-playpause', handleTvMediaPlayPause);
        window.removeEventListener('tv-media-rewind', handleTvMediaRewind);
        window.removeEventListener('tv-media-fastforward', handleTvMediaFastForward);
        window.removeEventListener('tv-exit-fullscreen', handleTvExitFullscreen);
        if (touchSingleTapTimer) clearTimeout(touchSingleTapTimer);
        if (desktopSingleClickTimer) clearTimeout(desktopSingleClickTimer);
        if (hideControlsTimer) clearTimeout(hideControlsTimer);
        if (longPressTimer) clearTimeout(longPressTimer);
        leftOverlay.remove();
        rightOverlay.remove();
        centerOverlay.remove();
        speed2xOverlay.remove();
        disableSimulatedLandscape();
        unlockOrientation().catch(() => {});
        triggerGestureDomRef.current = null;
      });
    });

    // Đồng bộ trạng thái hiển thị thanh công cụ
    art.on('control', (state) => {
      const isShow = Boolean(state);
      setIsControlsVisible(isShow);
      if (art.template?.$player) {
        if (isShow) {
          art.template.$player.classList.remove('art-controls-hidden');
        } else {
          art.template.$player.classList.add('art-controls-hidden');
        }
      }
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
      const remaining = duration - current;

      if (Math.abs(current - lastSaved) >= 5) {
        lastSaved = current;
        onTimeUpdateRef.current?.(current, duration);
      }

      // Khi gần hết tập (còn <= 45s và duration > 60s) và có tập tiếp theo
      if (nextEpisodeRef.current && duration > 60) {
        if (remaining > 0 && remaining <= 45 && dismissedEpSlugRef.current !== currentEpisodeRef.current?.slug) {
          setShowNextEpisodePopup(true);
          setNextEpCountdown(Math.min(15, Math.max(1, Math.floor(remaining))));
        } else if (remaining > 50) {
          setShowNextEpisodePopup(false);
        }
      }
    });

    art.on('video:ended', () => {
      if (nextEpisodeRef.current && dismissedEpSlugRef.current !== currentEpisodeRef.current?.slug) {
        setShowNextEpisodePopup(false);
        onNextEpisodeRef.current?.();
      }
      onEndedRef.current?.();
    });

    return () => {
      host.remove();
      setPortalHost(null);
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      if (instanceRef.current) {
        instanceRef.current.destroy(false);
      }
    };
  }, [url]);

  const currentServerObj = episodes ? (episodes[drawerServerIdx] || episodes[0]) : null;
  const drawerEpisodeList = currentServerObj?.server_data || [];

  return (
    <div
      className={
        isSimulatedLandscapeState
          ? 'fixed inset-0 z-[999999] bg-black w-screen h-screen overflow-hidden'
          : `relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black group ${className}`
      }
    >
      <div ref={artRef} className="w-full h-full select-none" />

      {portalHost &&
        createPortal(
          <>
            {/* 1. Toggle Button góc trên bên phải để mở danh sách tập phim không cần thoát */}
            {episodes && episodes.length > 0 && (
              <button
                type="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEpisodeDrawerOpen((prev) => !prev);
                }}
                className={`zen-ep-toggle-btn absolute top-3.5 right-3.5 z-[55] flex items-center gap-2 px-3 py-1.5 rounded-xl text-white select-none ${
                  isControlsVisible || isEpisodeDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                } ${isEpisodeDrawerOpen ? 'is-drawer-open' : ''}`}
                title="Chọn tập phim (không cần thoát ra ngoài)"
              >
                <Layers className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold tracking-wide">Chọn tập</span>
                {currentEpisode?.name && (
                  <span className="text-[10px] font-black bg-red-600 px-1.5 py-0.5 rounded text-white tracking-wider">
                    {cleanEpisodeBadge(currentEpisode.name)}
                  </span>
                )}
              </button>
            )}

            {/* 2. Drawer chọn tập ngay trong khung phát video */}
            {isEpisodeDrawerOpen && (
              <>
                <div
                  className="zen-episode-drawer-backdrop absolute inset-0 z-[68] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEpisodeDrawerOpen(false);
                  }}
                />

                <div
                  className="zen-episode-drawer absolute top-0 right-0 bottom-0 w-80 sm:w-96 max-w-[85vw] h-full bg-[#0b0c10]/95 backdrop-blur-2xl border-l border-white/10 z-[70] flex flex-col p-4 shadow-2xl text-slate-100 select-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Clapperboard className="w-5 h-5 text-red-500" />
                      <h3 className="font-bold text-white text-sm sm:text-base tracking-wide">
                        Danh sách tập phim
                      </h3>
                    </div>
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => setIsEpisodeDrawerOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      title="Đóng (Esc)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {episodes && episodes.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 mb-2.5 border-b border-white/5">
                      {episodes.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          tabIndex={0}
                          onClick={() => setDrawerServerIdx(idx)}
                          className={`text-xs px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                            drawerServerIdx === idx
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/40 ring-1 ring-red-400'
                              : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
                          }`}
                        >
                          {s.server_name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                      {drawerEpisodeList.map((ep) => {
                        const isActive = ep.slug === currentEpisode?.slug && drawerServerIdx === currentServer;
                        return (
                          <button
                            key={ep.slug}
                            ref={isActive ? activeEpBtnRef : undefined}
                            type="button"
                            tabIndex={0}
                            onClick={() => {
                              onSelectEpisode?.(drawerServerIdx, ep);
                              setIsEpisodeDrawerOpen(false);
                            }}
                            className={`zen-ep-item-btn py-2.5 px-1.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer truncate ${
                              isActive
                                ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 ring-2 ring-red-400 font-black scale-105'
                                : 'bg-white/5 hover:bg-white/15 text-slate-200 border border-white/5 hover:border-white/20 active:scale-95'
                            }`}
                            title={ep.name}
                          >
                            {cleanEpisodeText(ep.name)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 3. Popup góc dưới bên phải: Tập tiếp theo & Nút Tiếp tục */}
            {showNextEpisodePopup && nextEpisode && (
              <div
                className="zen-next-ep-popup absolute bottom-20 sm:bottom-24 right-4 sm:right-6 z-[65] max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto bg-[#0f172a]/95 backdrop-blur-2xl border border-red-500/50 rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-black/90 flex items-center gap-3.5 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                {poster && (
                  <div className="relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden shrink-0 bg-black/60 border border-white/10">
                    <img src={poster} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
                      Tập tiếp theo
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">• Tự phát sau {nextEpCountdown}s</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {cleanEpisodeText(nextEpisode.name)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => {
                      setShowNextEpisodePopup(false);
                      onNextEpisode?.();
                    }}
                    className="zen-next-ep-btn px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/40 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <span>Tiếp tục</span>
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </button>

                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => {
                      setShowNextEpisodePopup(false);
                      if (currentEpisode) {
                        setDismissedEpSlug(currentEpisode.slug);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Đóng thông báo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>,
          portalHost
        )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
