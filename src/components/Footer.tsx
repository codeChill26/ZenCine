import { Logo } from './Logo';
import React from 'react';
import { Shield, Zap, Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-white/10 bg-[#08090c] py-12 text-slate-400">
      <div className="w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

          <div className="space-y-4 md:col-span-1">
            <a href="#/">
              <Logo size="sm" />
            </a>
            <p className="text-xs leading-relaxed text-slate-400">
              Trải nghiệm xem phim Full HD tốc độ cao, hoàn toàn miễn phí, chuẩn giao thức HLS Adaptive Streaming không chứa quảng cáo gây phiền toái.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Khám Phá</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#/type/phim-le" className="hover:text-red-400 transition-colors">Phim Lẻ Đỉnh Cao</a></li>
              <li><a href="#/type/phim-bo" className="hover:text-red-400 transition-colors">Phim Bộ Mới Nhất</a></li>
              <li><a href="#/type/hoat-hinh" className="hover:text-red-400 transition-colors">Hoạt Hình Anime Vietsub</a></li>
              <li><a href="#/category/hanh-dong" className="hover:text-red-400 transition-colors">Phim Hành Động Chiếu Rạp</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Tính Năng Đẳng Cấp</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Player HLS.js 1080p Siêu Tốc</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Không Quảng Cáo Pop-up Rác</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Lưu Mốc Xem Dở Tự Động</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Tuyên Bố Miễn Trừ</h4>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Mọi dữ liệu hình ảnh, video và thông tin phim trên trang web được tổng hợp và phân phối từ các nguồn API mở công khai trên Internet. Chúng tôi không lưu trữ bất kỳ tệp video nào trên máy chủ riêng.
            </p>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} ZenCine. This cinema is cooked by Phuc</p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
            <span>for Movie Enthusiasts</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
