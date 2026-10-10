export interface MovieItem {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  origin_name?: string;
  poster_url: string;
  thumb_url: string;
  year?: number;
  quality?: string;
  lang?: string;
  episode_current?: string;
  time?: string;
  type?: string;
  category?: { id: string; name: string; slug: string }[];
  country?: { id: string; name: string; slug: string }[];
  tmdb?: { vote_average?: number; vote_count?: number };
  imdb?: { vote_average?: number; vote_count?: number };
}

export interface MovieDetail extends MovieItem {
  content: string;
  notify?: string;
  showtimes?: string;
  view?: number;
  actor?: string[];
  director?: string[];
  trailer_url?: string;
  is_copyright?: boolean;
  sub_docquyen?: boolean;
  chieurap?: boolean;
}

export interface EpisodeData {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
}

export interface EpisodeServer {
  server_name: string;
  server_data: EpisodeData[];
}

export interface MovieDetailResponse {
  status: boolean | string;
  msg?: string;
  movie: MovieDetail;
  episodes: EpisodeServer[];
}

export interface MovieListResponse {
  status: boolean | string;
  items: MovieItem[];
  pagination?: {
    totalItems: number;
    totalItemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
  APP_DOMAIN_CDN_IMAGE?: string;
}

export interface WatchHistoryItem {
  slug: string;
  name: string;
  thumb_url: string;
  episodeName: string;
  episodeSlug: string;
  serverIndex: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
}
