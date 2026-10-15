import type { MovieItem } from '../types/movie';
import { searchMovies } from './api';

const TMDB_API_KEY = 'e9e9d8da18ae29fc430845952232787c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

export interface PersonProfile {
  id: number;
  name: string;
  originalName: string;
  profilePath: string | null;
  department: string;
  knownFor: string[];
}

// Common Vietnamese name aliases to assist TMDb person lookup
const VIETNAMESE_NAME_ALIASES: Record<string, string> = {
  'thanh long': 'Jackie Chan',
  'thành long': 'Jackie Chan',
  'chan tu dan': 'Donnie Yen',
  'chân tử đan': 'Donnie Yen',
  'ngo kinh': 'Wu Jing',
  'ngô kinh': 'Wu Jing',
  'luu duc hoa': 'Andy Lau',
  'lưu đức hoa': 'Andy Lau',
  'co thien lac': 'Louis Koo',
  'cổ thiên lạc': 'Louis Koo',
  'luong trieu vy': 'Tony Leung',
  'lương triều vỹ': 'Tony Leung',
  'chau nhuan phat': 'Chow Yun-fat',
  'châu nhuận phát': 'Chow Yun-fat',
  'kim tinh': 'Stephen Chow',
  'chau tinh tri': 'Stephen Chow',
  'châu tinh trì': 'Stephen Chow',
  'ly lien kiet': 'Jet Li',
  'lý liên kiệt': 'Jet Li',
  'duong tu quynh': 'Michelle Yeoh',
  'dương tử quỳnh': 'Michelle Yeoh',
  'hong kim bao': 'Sammo Hung',
  'hồng kim bảo': 'Sammo Hung',
  'nguyen xuan': 'Yuen Biao',
  'nguyên bưu': 'Yuen Biao',
  'truong man': 'Sharla Cheung',
  'trương mẫn': 'Sharla Cheung',
  'ngo manh dat': 'Ng Man-tat',
  'ngô mạnh đạt': 'Ng Man-tat',
};

// Popular actor presets for quick clicking in search UI
export const POPULAR_ACTORS = [
  'Châu Tinh Trì',
  'Thành Long',
  'Tom Cruise',
  'Trấn Thành',
  'Leonardo DiCaprio',
  'Triệu Lệ Dĩnh',
  'Lý Liên Kiệt',
  'Chân Tử Đan',
  'Dương Mịch',
  'Cổ Thiên Lạc',
  'Song Joong-ki',
  'Hyun Bin',
];

// Popular director presets for quick clicking in search UI
export const POPULAR_DIRECTORS = [
  'Christopher Nolan',
  'James Cameron',
  'Quentin Tarantino',
  'Steven Spielberg',
  'Lý Hải',
  'Victor Vũ',
  'Trấn Thành',
  'Bong Joon-ho',
  'Denis Villeneuve',
  'Guillermo del Toro',
];

/**
 * Find actor or director on TMDb
 */
export async function searchPerson(query: string): Promise<PersonProfile | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();
  const searchName = VIETNAMESE_NAME_ALIASES[normalized] || trimmed;

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&language=vi-VN&query=${encodeURIComponent(
        searchName
      )}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const person = data.results?.[0];
    if (!person) return null;

    const knownFor = (person.known_for || [])
      .map((m: any) => m.title || m.name)
      .filter(Boolean);

    return {
      id: person.id,
      name: person.name,
      originalName: person.original_name || person.name,
      profilePath: person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null,
      department: person.known_for_department || 'Acting',
      knownFor,
    };
  } catch (err) {
    console.error('Lỗi tra cứu diễn viên/đạo diễn:', err);
    return null;
  }
}

/**
 * Search movies by person (Actor or Director)
 * Queries TMDb for their filmography, then resolves available streams on ZenCine/KKPhim
 */
export async function searchMoviesByPerson(
  query: string,
  role: 'actor' | 'director' | 'all' = 'all'
): Promise<{ person: PersonProfile | null; movies: MovieItem[] }> {
  const person = await searchPerson(query);
  if (!person) {
    return { person: null, movies: [] };
  }

  try {
    // 1. Fetch movie credits from TMDb in Vietnamese
    const res = await fetch(
      `${TMDB_BASE_URL}/person/${person.id}/movie_credits?api_key=${TMDB_API_KEY}&language=vi-VN`
    );
    if (!res.ok) {
      return { person, movies: [] };
    }

    const data = await res.json();

    let credits: any[] = [];
    if (role === 'director') {
      credits = (data.crew || []).filter((c: any) => c.job === 'Director');
    } else if (role === 'actor') {
      credits = data.cast || [];
    } else {
      const isDirector = person.department === 'Directing';
      if (isDirector) {
        credits = [
          ...(data.crew || []).filter((c: any) => c.job === 'Director'),
          ...(data.cast || []),
        ];
      } else {
        credits = [
          ...(data.cast || []),
          ...(data.crew || []).filter((c: any) => c.job === 'Director'),
        ];
      }
    }

    // Sort by vote_count / popularity (most famous movies first)
    credits.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));

    // Extract unique titles (up to 15 key titles)
    const titlesToLookup: string[] = [];
    const seenTitles = new Set<string>();

    for (const c of credits) {
      const title = c.title || c.name;
      if (title && !seenTitles.has(title.toLowerCase())) {
        seenTitles.add(title.toLowerCase());
        titlesToLookup.push(title);
      }
      // Also add original title if different and in English / Latin
      if (c.original_title && c.original_title !== title && !seenTitles.has(c.original_title.toLowerCase())) {
        if (!/[^\x00-\x7F]/.test(c.original_title) || c.original_language === 'en') {
          seenTitles.add(c.original_title.toLowerCase());
          titlesToLookup.push(c.original_title);
        }
      }
      if (titlesToLookup.length >= 15) break;
    }

    // 2. Query ZenCine / KKPhim database in parallel for each movie
    const searchPromises = titlesToLookup.map(async (title) => {
      try {
        const resp = await searchMovies(title, 1);
        return resp.items?.[0] || null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(searchPromises);

    // Deduplicate movies by slug
    const movies: MovieItem[] = [];
    const seenSlugs = new Set<string>();

    for (const m of results) {
      if (m && m.slug && !seenSlugs.has(m.slug)) {
        seenSlugs.add(m.slug);
        movies.push(m);
      }
    }

    return { person, movies };
  } catch (err) {
    console.error('Lỗi lấy danh sách phim của người này:', err);
    return { person, movies: [] };
  }
}
