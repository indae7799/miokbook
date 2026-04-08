import type { GradeKey } from '@/lib/constants/grades';

export type SelectedBookItem = {
  isbn: string;
  title?: string;
  coverImage?: string;
};

export type SelectedBooksByGrade = Partial<Record<GradeKey, SelectedBookItem[]>>;

export interface SelectedBooksBanner {
  imageUrl: string;
  linkUrl: string;
}

export interface SelectedBooksMonthlyEntry {
  grades: SelectedBooksByGrade;
  banner: SelectedBooksBanner | null;
}

export type SelectedBooksMonthlyMap = Record<string, SelectedBooksMonthlyEntry>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function getCurrentSeoulMonthKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

export function normalizeSelectedBooksBanner(raw: unknown): SelectedBooksBanner | null {
  if (!isRecord(raw)) return null;
  const imageUrl = String(raw.imageUrl ?? '').trim();
  if (!imageUrl) return null;
  return {
    imageUrl,
    linkUrl: String(raw.linkUrl ?? '/').trim() || '/',
  };
}

export function normalizeSelectedBooksByGrade(raw: unknown): SelectedBooksByGrade {
  if (!isRecord(raw)) return {};

  const out: SelectedBooksByGrade = {};
  for (const [gradeKey, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;

    const books = value
      .map((book) => {
        if (!isRecord(book)) return null;
        const isbn = String(book.isbn ?? '').trim();
        if (!isbn) return null;
        const title = String(book.title ?? '').trim();
        const coverImage = String(book.coverImage ?? '').trim();
        return {
          isbn,
          ...(title ? { title } : {}),
          ...(coverImage ? { coverImage } : {}),
        };
      })
      .filter((book): book is SelectedBookItem => book !== null);

    if (books.length > 0) {
      out[gradeKey as GradeKey] = books;
    }
  }

  return out;
}

export function normalizeSelectedBooksMonthlyEntry(raw: unknown): SelectedBooksMonthlyEntry {
  if (!isRecord(raw)) {
    return { grades: {}, banner: null };
  }

  return {
    grades: normalizeSelectedBooksByGrade(raw.grades),
    banner: normalizeSelectedBooksBanner(raw.banner),
  };
}

export function normalizeSelectedBooksMonthlyMap(raw: unknown): SelectedBooksMonthlyMap {
  if (!isRecord(raw)) return {};

  const out: SelectedBooksMonthlyMap = {};
  for (const [monthKey, value] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
    out[monthKey] = normalizeSelectedBooksMonthlyEntry(value);
  }
  return out;
}

export function resolveSelectedBooksSnapshot(options: {
  monthly: SelectedBooksMonthlyMap;
  targetMonthKey: string;
  legacyGrades?: unknown;
  legacyBanner?: unknown;
}): SelectedBooksMonthlyEntry & { monthKey: string | null } {
  const { monthly, targetMonthKey, legacyGrades, legacyBanner } = options;
  const monthKeys = Object.keys(monthly).sort();
  const exact = monthly[targetMonthKey];
  if (exact) {
    return { monthKey: targetMonthKey, grades: exact.grades, banner: exact.banner };
  }

  const fallbackMonthKey = [...monthKeys].reverse().find((monthKey) => monthKey <= targetMonthKey) ?? null;
  if (fallbackMonthKey) {
    const fallback = monthly[fallbackMonthKey]!;
    return { monthKey: fallbackMonthKey, grades: fallback.grades, banner: fallback.banner };
  }

  return {
    monthKey: null,
    grades: normalizeSelectedBooksByGrade(legacyGrades),
    banner: normalizeSelectedBooksBanner(legacyBanner),
  };
}
