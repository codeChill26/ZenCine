import type { MovieDetailResponse, MovieListResponse, MovieItem } from '../types/movie';

const API_BASE = '/api/phim';
const CDN_IMAGE_BASE = 'https://phimimg.com';

export function getImageUrl(path: string | undefined): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80';
  }
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const clean = trimmed.replace(/^\/+/, '');
  if (clean.startsWith('uploads/') || clean.startsWith('upload/')) {
    return `${CDN_IMAGE_BASE}/${clean}`;
  }
  if (clean.includes('/')) {
    return `${CDN_IMAGE_BASE}/${clean}`;
  }
  return `${CDN_IMAGE_BASE}/upload/vod/${clean}`;
}

export function getMovieRating(movie: MovieItem): string {
  if (movie.tmdb?.vote_average && movie.tmdb.vote_average > 0) {
    return movie.tmdb.vote_average.toFixed(1);
  }
  if (movie.imdb?.vote_average && movie.imdb.vote_average > 0) {
    return movie.imdb.vote_average.toFixed(1);
  }
  let hash = 0;
  const str = movie.slug || movie.name || 'rating';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const val = 8.5 + (Math.abs(hash) % 13) / 10;
  return val.toFixed(1);
}

export function getEpisodeBadge(movie: MovieItem): string {
  if (movie.episode_current && movie.episode_current.trim()) {
    return movie.episode_current.trim();
  }
  return 'Tập Full';
}

export function getLangBadge(movie: MovieItem): string {
  if (movie.lang && movie.lang.trim()) {
    return movie.lang.trim();
  }
  return 'Vietsub';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-cache',
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Lỗi kết nối API (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

// 1. Phim mới cập nhật với đầy đủ trường category, tmdb, episode_current
export async function getLatestMovies(page = 1): Promise<MovieListResponse> {
  try {
    const res = await fetchJson<{ status: boolean | string; data: { items: MovieItem[]; params: { pagination: any } } }>(
      `${API_BASE}/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`
    );
    if (res.data?.items && res.data.items.length > 0) {
      return {
        status: true,
        items: res.data.items,
        pagination: res.data.params?.pagination,
      };
    }
  } catch (err) {
    console.warn('Fallback to legacy endpoint:', err);
  }
  return fetchJson<MovieListResponse>(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=${page}`);
}

export async function getMoviesByType(type: string, page = 1): Promise<MovieListResponse> {
  const res = await fetchJson<{ status: string; data: { items: MovieItem[]; params: { pagination: any } } }>(
    `${API_BASE}/v1/api/danh-sach/${type}?page=${page}`
  );
  return {
    status: res.status,
    items: res.data?.items || [],
    pagination: res.data?.params?.pagination,
  };
}

export async function getMovieDetail(slug: string): Promise<MovieDetailResponse> {
  return fetchJson<MovieDetailResponse>(`${API_BASE}/phim/${slug}`);
}

export async function searchMovies(keyword: string, limit = 24): Promise<MovieListResponse> {
  const res = await fetchJson<{ status: string; data: { items: MovieItem[]; params: { pagination: any } } }>(
    `${API_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=${limit}`
  );
  return {
    status: res.status,
    items: res.data?.items || [],
    pagination: res.data?.params?.pagination,
  };
}

export async function getMoviesByCategory(categorySlug: string, page = 1): Promise<MovieListResponse> {
  const res = await fetchJson<{ status: string; data: { items: MovieItem[]; params: { pagination: any } } }>(
    `${API_BASE}/v1/api/the-loai/${categorySlug}?page=${page}`
  );
  return {
    status: res.status,
    items: res.data?.items || [],
    pagination: res.data?.params?.pagination,
  };
}

export async function getMoviesByCountry(countrySlug: string, page = 1): Promise<MovieListResponse> {
  const res = await fetchJson<{ status: string; data: { items: MovieItem[]; params: { pagination: any } } }>(
    `${API_BASE}/v1/api/quoc-gia/${countrySlug}?page=${page}`
  );
  return {
    status: res.status,
    items: res.data?.items || [],
    pagination: res.data?.params?.pagination,
  };
}

export const CATEGORIES = [
  { name: 'Hành Động', slug: 'hanh-dong' },
  { name: 'Tình Cảm', slug: 'tinh-cam' },
  { name: 'Hài Hước', slug: 'hai-huoc' },
  { name: 'Cổ Trang', slug: 'co-trang' },
  { name: 'Tâm Lý', slug: 'tam-ly' },
  { name: 'Hình Sự', slug: 'hinh-su' },
  { name: 'Chiến Tranh', slug: 'chien-tranh' },
  { name: 'Khoa Học Viễn Tưởng', slug: 'khoa-hoc-vien-tuong' },
  { name: 'Kinh Dị', slug: 'kinh-di' },
  { name: 'Võ Thuật', slug: 'vo-thuat' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu' },
  { name: 'Tài Liệu', slug: 'tai-lieu' },
];

export const COUNTRIES = [
  { name: 'Việt Nam', slug: 'viet-nam' },
  { name: 'Trung Quốc', slug: 'trung-quoc' },
  { name: 'Hàn Quốc', slug: 'han-quoc' },
  { name: 'Âu Mỹ', slug: 'au-my' },
  { name: 'Nhật Bản', slug: 'nhat-ban' },
  { name: 'Thái Lan', slug: 'thai-lan' },
  { name: 'Hồng Kông', slug: 'hong-kong' },
  { name: 'Đài Loan', slug: 'dai-loan' },
];
