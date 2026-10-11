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
  const triggerGestureDomRef = useRef<((side: 'left' | 'right' | 'center', text?: string, iconSvg?: string) => void) | null>(null);

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
      // 1. Double click bên phải = Tua tới 10s (+10s)
      // 2. Double click bên trái = Tua lùi 10s (-10s)
      // 3. Double click màn hình (vùng giữa) = Phóng to ra / Thu nhỏ (Fullscreen)
      // 4. Bấm 1 lần vào màn hình = Ẩn / hiện thanh công cụ
      // =========================================================================
      const playerEl = art.template.$player;

      // Double tap / double click feedback overlay in player DOM (visible in both normal and fullscreen)
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
        // Chỉ ẩn thanh công cụ khi video đang phát (hoặc khi ép buộc ẩn do người dùng chạm màn hình) và chuột không hover
        if (!force && (art.video.paused || isBottomHovered)) return;
        playerEl.classList.add('art-controls-hidden');
        playerEl.classList.add('art-hide-cursor');
        art.controls.show = false;
        setControlsVisible(false);
      };

      const showToolbar = (autoHide = true) => {
        if (hideControlsTimer) {
          clearTimeout(hideControlsTimer);
          hideControlsTimer = null;
        }
        playerEl.classList.remove('art-controls-hidden');
        playerEl.classList.remove('art-hide-cursor');
        art.controls.show = true;
        setControlsVisible(true);

        // Nếu video đang phát và chuột không hover trên thanh điều khiển, tự động trượt xuống ẩn sau 3 giây
        if (autoHide && !art.video.paused && !isBottomHovered) {
          hideControlsTimer = setTimeout(() => {
            hideToolbar();
          }, 3000);
        }
      };

      const toggleToolbar = () => {
        const isHidden = playerEl.classList.contains('art-controls-hidden') || !art.controls.show;
        if (isHidden) {
          showToolbar(true);
        } else {
          hideToolbar(true);
        }
      };

      // Handle Double Click / Tap action based on horizontal screen zone
      const handleDoubleAction = (clientX: number) => {
        const rect = playerEl.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const width = rect.width;

        const leftZone = width * 0.38;
        const rightZone = width * 0.62;

        if (clickX > rightZone) {
          // Double click / tap bên phải => Tua tới 10s
          const dur = art.duration || 999999;
          art.seek = Math.min(dur, art.currentTime + 10);
          art.notice.show = '⏩ Tua 10s';
          triggerGestureFeedback('right');
        } else if (clickX < leftZone) {
          // Double click / tap bên trái => Tua lùi 10s
          art.seek = Math.max(0, art.currentTime - 10);
          art.notice.show = '⏪ Lùi 10s';
          triggerGestureFeedback('left');
        } else {
          // Double click / tap màn hình (vùng giữa) => Phóng to ra / Thu nhỏ
          const willBeFs = !art.fullscreen;
          art.fullscreen = willBeFs;
          art.notice.show = willBeFs ? '⛶ Phóng to toàn màn hình' : '⛶ Thu nhỏ màn hình';
          triggerGestureFeedback(
            'center',
            willBeFs ? 'Phóng to' : 'Thu nhỏ',
            `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>`
          );
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
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        // Bỏ qua nếu chạm vào các thành phần điều khiển trực tiếp
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

        // Nếu vuốt màn hình (khoảng cách > 25px) hoặc nhấn giữ lâu (> 500ms), không tính là tap
        if (moveDist > 25 || touchDuration > 500) {
          return;
        }

        lastTouchEndTime = Date.now();

        // Chặn click giả lập của trình duyệt để xử lý tức thì không bị delay 300ms
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
          handleDoubleAction(touch.clientX);
          showToolbar(true);
        } else {
          // Single Tap đầu tiên
          lastTouchTapTime = now;
          lastTouchTapX = touch.clientX;
          lastTouchTapY = touch.clientY;

          if (touchSingleTapTimer) {
            clearTimeout(touchSingleTapTimer);
          }
          touchSingleTapTimer = setTimeout(() => {
            touchSingleTapTimer = null;
            lastTouchTapTime = 0;
            toggleToolbar();
          }, 300);
        }
      };

      // Desktop Click Interaction
      let lastDesktopClickTime = 0;
      let lastDesktopClickX = 0;
      let lastDesktopClickY = 0;
      let desktopSingleClickTimer: any = null;

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

        // Bỏ qua click được sinh ra từ touch trên mobile
        if (Date.now() - lastTouchEndTime < 600) {
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
          handleDoubleAction(e.clientX);
          showToolbar(true);
        } else {
          // Single Click trên desktop
          lastDesktopClickTime = now;
          lastDesktopClickX = e.clientX;
          lastDesktopClickY = e.clientY;

          if (desktopSingleClickTimer) {
            clearTimeout(desktopSingleClickTimer);
          }
          desktopSingleClickTimer = setTimeout(() => {
            desktopSingleClickTimer = null;
            lastDesktopClickTime = 0;
            toggleToolbar();
          }, 280);
        }
      };

      // Di chuyển chuột trên Desktop sẽ khôi phục hiển thị thanh công cụ
      const onMouseMove = () => {
        showToolbar(true);
      };

      // Khi chuột rời khỏi khung player, tự động ẩn sau 1 giây
      const onMouseLeave = () => {
        if (!art.video.paused) {
          if (hideControlsTimer) clearTimeout(hideControlsTimer);
          hideControlsTimer = setTimeout(() => {
            hideToolbar();
          }, 1000);
        }
      };

      // Giữ thanh công cụ luôn hiện khi chuột đang hover trong khu vực điều khiển bên dưới (chỉ tính chuột thực tế)
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

      // Khi chạm vào thanh điều khiển trên điện thoại: Gia hạn đếm ngược tự ẩn
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
      playerEl.addEventListener('touchstart', onTouchStart, { passive: true });
      playerEl.addEventListener('touchend', onTouchEnd, { passive: false });
      playerEl.addEventListener('mousemove', onMouseMove);
      playerEl.addEventListener('mouseleave', onMouseLeave);
      bottomEl?.addEventListener('mouseenter', onBottomMouseEnter);
      bottomEl?.addEventListener('mouseleave', onBottomMouseLeave);
      bottomEl?.addEventListener('touchstart', onBottomTouchStart, { passive: true });
      bottomEl?.addEventListener('touchend', onBottomTouchEnd, { passive: true });

      // Lắng nghe sự kiện phát / dừng video để tự động hẹn giờ ẩn thanh công cụ
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
        playerEl.removeEventListener('touchstart', onTouchStart);
        playerEl.removeEventListener('touchend', onTouchEnd);
        playerEl.removeEventListener('mousemove', onMouseMove);
        playerEl.removeEventListener('mouseleave', onMouseLeave);
        bottomEl?.removeEventListener('mouseenter', onBottomMouseEnter);
        bottomEl?.removeEventListener('mouseleave', onBottomMouseLeave);
        bottomEl?.removeEventListener('touchstart', onBottomTouchStart);
        bottomEl?.removeEventListener('touchend', onBottomTouchEnd);
        if (touchSingleTapTimer) clearTimeout(touchSingleTapTimer);
        if (desktopSingleClickTimer) clearTimeout(desktopSingleClickTimer);
        if (hideControlsTimer) clearTimeout(hideControlsTimer);
        leftOverlay.remove();
        rightOverlay.remove();
        centerOverlay.remove();
        triggerGestureDomRef.current = null;
      });
    });

    // Đồng bộ trạng thái hiển thị thanh công cụ giữa Artplayer và React
    setControlsVisible(true);
    art.on('control', (state) => {
      const isShow = Boolean(state);
      setControlsVisible(isShow);
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
    <div className={`relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black group ${className}`}>
      <div ref={artRef} className="w-full h-full select-none" />

      {/* Video Title and Episode Overlay (Bottom Left above progress bar) */}
      {(title || episodeName) && (
        <div
          className={`absolute bottom-[66px] sm:bottom-[74px] left-3.5 sm:left-5 z-20 pointer-events-none transition-all duration-300 ${
            controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
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
