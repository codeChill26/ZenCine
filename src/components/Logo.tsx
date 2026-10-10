import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <div className={`flex items-center gap-2.5 group cursor-pointer select-none ${className}`}>
      {/* Crown Play Button Emblem */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        {/* Subtle Ambient Red Glow */}
        <div className="absolute top-0 right-0 w-6 h-6 bg-red-600/40 rounded-full blur-md group-hover:bg-red-500/60 transition-colors" />

        {/* Vector SVG matching exactly the reference image */}
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-md"
        >
          {/* Crown (Cinema Red #e50914 matching 'Đang thịnh hành' badge) */}
          <path
            d="M48 34L56 12L66 26L80 18L84 36L98 33L88 54C88 54 68 44 48 34Z"
            fill="#e50914"
          />

          {/* Outer Rounded Play Triangle */}
          <path
            d="M34 36L34 86L82 61Z"
            stroke="#ffffff"
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Inner Play Triangle */}
          <path
            d="M47 48L47 74L70 61Z"
            stroke="#ffffff"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center tracking-tight">
            <span className={`font-black ${textSizes[size]} text-white tracking-normal`}>
              Zen
            </span>
            <span className={`font-black ${textSizes[size]} text-red-600 ml-0.5 tracking-tight drop-shadow-sm`}>
              Cine
            </span>
          </div>
          <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-slate-400 group-hover:text-red-400 transition-colors pl-0.5 mt-0.5">
            CINESTREAM • 4K
          </span>
        </div>
      )}
    </div>
  );
};
