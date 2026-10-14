import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

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
}, ref) => {
  const artRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Artplayer | null>(null);
  const [isSimulatedLandscapeState, setIsSimulatedLandscapeState] = useState(false);
  const triggerGestureDomRef = useRef<((side: 'left' | 'right' | 'center', text?: string, iconSvg?: string) => void) | null>(null);
  const toggleFullscreenRef = useRef<((target?: boolean) => void) | null>(null);

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
      hotkey: true,
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
            top: '12px',
            right: '14px',
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
        if (!force && (art.video.paused || isBottomHovered)) return;
        playerEl.classList.add('art-controls-hidden');
        playerEl.classList.add('art-hide-cursor');
        art.controls.show = false;
      };

      const showToolbar = (autoHide = true) => {
        if (hideControlsTimer) {
          clearTimeout(hideControlsTimer);
          hideControlsTimer = null;
        }
        playerEl.classList.remove('art-controls-hidden');
        playerEl.classList.remove('art-hide-cursor');
        art.controls.show = true;

        if (autoHide && !art.video.paused && !isBottomHovered) {
          hideControlsTimer = setTimeout(() => {
            hideToolbar();
          }, 3000);
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
        } else {
          playerEl.classList.remove('art-fullscreen');
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

        // 1. Kích hoạt khóa xoay ngang màn hình ngay trong chuỗi thao tác của người dùng
        lockLandscape().catch(() => {});

        // 2. Yêu cầu toàn màn hình phần tử trình phát
        try {
          if (playerEl.requestFullscreen) {
            await playerEl.requestFullscreen({ navigationUI: 'hide' });
          } else if ((playerEl as any).webkitRequestFullscreen) {
            await (playerEl as any).webkitRequestFullscreen();
          }
        } catch (err) {
          console.warn('Native requestFullscreen could not be invoked:', err);
        }

        // Thử lại orientation lock sau khi fullscreen vừa mở
        lockLandscape().catch(() => {});

        // 3. Với điện thoại: Nếu hệ thống không tự xoay ngang (iOS, máy bật khóa xoay dọc), bật xoay ngang giả lập CSS 90 độ
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

        art.notice.show = '⛶ Phóng to toàn màn hình';
        triggerGestureFeedback(
          'center',
          'Phóng to',
          `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>`
        );
      };

      const exitLandscapeFullscreen = async () => {
        isManualFullscreen = false;
        disableSimulatedLandscape();

        try {
          if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
            if (document.exitFullscreen) {
              await document.exitFullscreen().catch(() => {});
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen().catch(() => {});
            }
          }
        } catch (err) {
          console.warn('Exit fullscreen error:', err);
        }

        unlockOrientation().catch(() => {});

        updateFullscreenIcons(false);
        art.emit('resize');

        art.notice.show = '⛶ Thu nhỏ màn hình';
        triggerGestureFeedback(
          'center',
          'Thu nhỏ',
          `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>`
        );
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
      let lastTouchEndTime = 0;

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

        if (hasTriggeredLongPress || touchDuration > 380 || moveDist > 25) {
          return;
        }

        lastTouchEndTime = Date.now();

        if (e.cancelable) {
          e.preventDefault();
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
          target.closest('.art-watermark-badge')
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
          target.closest('.art-watermark-badge') ||
          target.closest('.art-setting') ||
          target.closest('.art-settings')
        ) {
          return;
        }

        if (Date.now() - lastTouchEndTime < 600 || hasTriggeredLongPress) {
          return;
        }

        e.stopPropagation();
        e.preventDefault();

        const now = Date.now();
        const clickInterval = now - lastDesktopClickTime;
        const clickDist = Math.hypot(e.clientX - lastDesktopClickX, e.clientY - lastDesktopClickY);

        if (clickInterval < 350 && clickDist < 40) {
          // Double Click trên desktop
          if (desktopSingleClickTimer) {
            clearTimeout(desktopSingleClickTimer);
            desktopSingleClickTimer = null;
          }
          lastDesktopClickTime = 0;
          handleDoubleAction(e.clientX, e.clientY);
          showToolbar(true);
        } else {
          // Single Click: Play / Pause
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
          }, 260);
        }
      };

      // Di chuyển chuột trên Desktop sẽ khôi phục hiển thị thanh công cụ
      const onMouseMove = () => {
        showToolbar(true);
      };

      // Khi chuột rời khỏi khung player, tự động ẩn sau 1 giây
      const onMouseLeave = () => {
        stopLongPress();
        if (!art.video.paused) {
          if (hideControlsTimer) clearTimeout(hideControlsTimer);
          hideControlsTimer = setTimeout(() => {
            hideToolbar();
          }, 1000);
        }
      };

      // Giữ thanh công cụ luôn hiện khi chuột đang hover trong khu vực điều khiển bên dưới
      const bottomEl = art.template.$bottom;
      const onBottomMouseEnter = () => {
        if (window.matchMedia('(pointer: fine)').matches) {
          isBottomHovered = true;
          if (hideControlsTimer) {
            clearTimeout(hideControlsTimer);
            hideControlsTimer = null;
          }
        }
      };

      const onBottomMouseLeave = () => {
        isBottomHovered = false;
        if (!art.video.paused) {
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
        if (!art.video.paused) {
          if (hideControlsTimer) clearTimeout(hideControlsTimer);
          hideControlsTimer = setTimeout(() => {
            hideToolbar();
          }, 3000);
        }
      };

      playerEl.addEventListener('click', onPlayerClick, true);
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

      // Phím tắt bàn phím Desktop: F để phóng to / thu nhỏ
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'f' || e.key === 'F') {
          if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
            e.preventDefault();
            toggleLandscapeFullscreen();
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
      if (art.template?.$player) {
        if (isShow) {
          art.template.$player.classList.remove('art-controls-hidden');
          art.template.$player.classList.remove('art-hide-cursor');
        } else {
          art.template.$player.classList.add('art-controls-hidden');
          art.template.$player.classList.add('art-hide-cursor');
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
      if (Math.abs(current - lastSaved) >= 5) {
        lastSaved = current;
        onTimeUpdate?.(current, duration);
      }
    });

    art.on('video:ended', () => {
      onEnded?.();
    });

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      if (instanceRef.current) {
        instanceRef.current.destroy(false);
      }
    };
  }, [url]);

  return (
    <div
      className={
        isSimulatedLandscapeState
          ? 'fixed inset-0 z-[999999] bg-black w-screen h-screen overflow-hidden'
          : `relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black group ${className}`
      }
    >
      <div ref={artRef} className="w-full h-full select-none" />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
