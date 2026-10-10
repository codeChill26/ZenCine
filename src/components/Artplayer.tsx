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

  useImperativeHandle(ref, () => ({
    rewind: (seconds = 10) => {
      if (instanceRef.current) {
        const cur = instanceRef.current.currentTime;
        const target = Math.max(0, cur - seconds);
        instanceRef.current.seek = target;
        instanceRef.current.notice.show = `⏪ Lùi ${seconds}s`;
      }
    },
    forward: (seconds = 10) => {
      if (instanceRef.current) {
        const cur = instanceRef.current.currentTime;
        const dur = instanceRef.current.duration || 999999;
        const target = Math.min(dur, cur + seconds);
        instanceRef.current.seek = target;
        instanceRef.current.notice.show = `⏩ Tua ${seconds}s`;
      }
    },
    getInstance: () => instanceRef.current,
  }));

  useEffect(() => {
    if (!artRef.current || !url) return;

    let hlsInstance: Hls | null = null;

    const art = new Artplayer({
      container: artRef.current,
      url: url,
      poster: poster || '',
      volume: 0.8,
      isLive: false,
      muted: false,
      autoplay: true,
      pip: true, // Thu nhỏ màn hình (Picture-in-Picture)
      autoSize: false,
      autoMini: true,
      screenshot: false,
      setting: true, // Cài đặt (Tốc độ, tỷ lệ, chất lượng)
      loop: false,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      theme: '#e50914',
      lang: 'vi',
      hotkey: true,
      airplay: true,
      lock: true,
      fastForward: true,
      autoPlayback: true,
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
          },
        },
      ],

      settings: [
        {
          html: 'Tốc độ phát',
          tooltip: '1.0x',
          selector: [
            { default: true, html: '1.0x (Bình thường)', value: 1.0 },
            { html: '0.75x', value: 0.75 },
            { html: '1.25x', value: 1.25 },
            { html: '1.5x', value: 1.5 },
            { html: '2.0x', value: 2.0 },
          ],
          onSelect: function (item: any) {
            art.playbackRate = item.value;
            return item.html;
          },
        },
        {
          html: 'Tỷ lệ khung hình',
          tooltip: '16:9',
          selector: [
            { default: true, html: 'Mặc định (16:9)', value: 'default' },
            { html: '4:3', value: '4:3' },
            { html: '16:9', value: '16:9' },
            { html: '21:9', value: '21:9' },
          ],
          onSelect: function (item: any) {
            art.aspectRatio = item.value;
            return item.html;
          },
        },
        {
          html: 'Lặp lại video',
          switch: false,
          onSwitch: function (item: any) {
            art.video.loop = !item.switch;
            return !item.switch;
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

            hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
              const levels = data.levels.map((level, index) => ({
                default: index === hls.currentLevel,
                html: `${level.height || 'Auto'}p`,
                level: index,
              }));

              if (levels.length > 1) {
                art.setting.add({
                  name: 'quality',
                  width: 150,
                  html: 'Chất lượng',
                  tooltip: 'Tự động',
                  selector: [
                    { default: true, html: 'Tự động (Auto)', level: -1 },
                    ...levels,
                  ],
                  onSelect: function (item: any) {
                    hls.currentLevel = item.level;
                    return item.html;
                  },
                });
              }
            });

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

    art.on('control', (state: boolean) => {
      setControlsVisible(state);
    });

    if (startTime > 10) {
      art.on('ready', () => {
        art.seek = startTime;
        art.notice.show = `Đang tiếp tục từ phút ${Math.floor(startTime / 60)}:${Math.floor(startTime % 60).toString().padStart(2, '0')}`;
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
    <div className={`relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black group ${className}`}>
      <div ref={artRef} className="w-full h-full" />

      {/* Video Title Overlay (Bottom Left above progress bar, exactly matching Image 2) */}
      {(title || episodeName) && (
        <div
          className={`absolute bottom-16 sm:bottom-20 left-4 sm:left-6 z-20 pointer-events-none transition-all duration-300 ${
            controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          {episodeName && (
            <div className="mb-1">
              <span className="bg-red-600 text-white font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded shadow-lg uppercase tracking-wider">
                {episodeName.toLowerCase().startsWith('tập') ? episodeName.toUpperCase() : `TẬP ${episodeName.toUpperCase()}`}
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
