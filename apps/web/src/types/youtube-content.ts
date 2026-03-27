/** Firestore 컬렉션: youtubeContents */
export type YoutubeExposureTarget = 'youtube' | 'concert';

export interface YoutubeContent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  /** 유튜브 재생 시 필수. 외부 전용이면 빈 문자열 */
  mainYoutubeId: string;
  relatedYoutubeIds: string[];
  customThumbnailUrl?: string;
  relatedImageUrl?: string;
  /**
   * 웹하드·자체 호스팅 등 유튜브가 아닌 주소.
   * - .mp4 등 **직접 파일 URL**이면 상세 페이지에서 `<video>`로 재생 시도
   * - 로그인형 웹하드 **페이지 URL**이면 새 창으로 열기 버튼만 표시 (iframe 불가)
  */
  externalPlaybackUrl?: string;
  exposureTargets: YoutubeExposureTarget[];
  relatedIsbns: string[];
  publishedAt: string;
  isPublished: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeYoutubeExposureTargets(raw: unknown): YoutubeExposureTarget[] {
  const values = Array.isArray(raw) ? raw : [];
  const normalized = values
    .map((value) => (value === 'concert' ? 'concert' : value === 'youtube' ? 'youtube' : null))
    .filter((value): value is YoutubeExposureTarget => Boolean(value));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : ['youtube'];
}

export function normalizeStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);
  }

  if (typeof raw !== 'string') return [];

  const text = raw.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);
    }
  } catch {
    // Fall through to Postgres array literal parsing.
  }

  if (text.startsWith('{') && text.endsWith('}')) {
    return text
      .slice(1, -1)
      .split(',')
      .map((value) => value.replace(/^"(.*)"$/, '$1').trim())
      .filter(Boolean);
  }

  return [text];
}

/**
 * Firestore `where('isPublished', '==', true)`는 문자열 "true"와 매칭되지 않습니다.
 * 어드민 JSON/레거시 데이터에서 불일치가 나지 않도록 읽기·쓰기 시 사용합니다.
 */
export function coerceYoutubeContentPublished(raw: unknown): boolean {
  return raw === true || raw === 'true' || raw === 1 || raw === '1';
}

export interface BookMeta {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  cover: string;
  description?: string;
  slug?: string;
  link?: string;
  source?: 'internal' | 'aladin';
}

export function getYoutubeThumbnail(
  videoId: string,
  quality: 'default' | 'mq' | 'hq' | 'sd' | 'maxres' = 'hq'
): string {
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  };
  return `https://i.ytimg.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** http(s)만 허용 (javascript: 등 차단) */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 경로가 흔한 스트리밍 확장자로 끝나면 브라우저 내장 플레이어로 재생 시도 */
export function isLikelyDirectVideoUrl(url: string): boolean {
  if (!isSafeHttpUrl(url)) return false;
  try {
    const path = new URL(url.trim()).pathname.toLowerCase();
    return /\.(mp4|webm|ogg|m4v|mov)(\?[^#]*)?$/i.test(path);
  } catch {
    return false;
  }
}
