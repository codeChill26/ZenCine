import React from 'react';
import { Film } from 'lucide-react';

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
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-2 group cursor-pointer select-none ${className}`}>
      {/* Film Reel Icon in Cinema Red */}
      <div className="relative text-red-600 flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
        <Film className={`${iconSizes[size]} stroke-[2.2]`} />
      </div>

      {/* Brand Typography */}
      {showText && (
        <span className={`font-black ${textSizes[size]} text-red-600 tracking-tight`}>
          ZenCine
        </span>
      )}
    </div>
  );
};

