export type BookCategoryGroupSlug =
  | 'literature'
  | 'humanities-society'
  | 'practical'
  | 'learning'
  | 'children-comics';

export type BookCategoryDetailSlug =
  | 'novel'
  | 'poetry-essay'
  | 'humanities'
  | 'history-culture'
  | 'society-politics'
  | 'business-management'
  | 'self-development'
  | 'health'
  | 'hobby-practical-sports'
  | 'travel'
  | 'foreign-language'
  | 'science'
  | 'computer-it'
  | 'arts-pop-culture'
  | 'youth'
  | 'infant'
  | 'children'
  | 'elementary-reference'
  | 'secondary-reference'
  | 'exam-license';

export type BookCategoryFilterSlug = BookCategoryGroupSlug | BookCategoryDetailSlug;

export interface BookCategoryGroup {
  slug: BookCategoryGroupSlug;
  name: string;
  shortName: string;
  detailSlugs: BookCategoryDetailSlug[];
}

export interface BookCategoryDetail {
  slug: BookCategoryDetailSlug;
  name: string;
  groupSlug: BookCategoryGroupSlug;
  aliases: string[];
}

export const BOOK_CATEGORY_GROUPS: readonly BookCategoryGroup[] = [
  {
    slug: 'literature',
    name: '문학',
    shortName: '문학',
    detailSlugs: ['novel', 'poetry-essay', 'youth'],
  },
  {
    slug: 'humanities-society',
    name: '인문사회',
    shortName: '인문',
    detailSlugs: ['humanities', 'history-culture', 'society-politics', 'business-management', 'self-development'],
  },
  {
    slug: 'practical',
    name: '실용교양',
    shortName: '실용',
    detailSlugs: ['health', 'hobby-practical-sports', 'travel', 'foreign-language', 'science', 'computer-it', 'arts-pop-culture'],
  },
  {
    slug: 'learning',
    name: '학습',
    shortName: '학습',
    detailSlugs: ['elementary-reference', 'secondary-reference', 'exam-license'],
  },
  {
    slug: 'children-comics',
    name: '어린이',
    shortName: '어린이',
    detailSlugs: ['infant', 'children'],
  },
] as const;

export const BOOK_CATEGORY_DETAILS: readonly BookCategoryDetail[] = [
  { slug: 'novel', name: '소설', groupSlug: 'literature', aliases: ['소설', '한국소설', '영미소설', '일본소설'] },
  { slug: 'poetry-essay', name: '시/에세이', groupSlug: 'literature', aliases: ['시', '에세이', '시/에세이'] },
  { slug: 'humanities', name: '인문', groupSlug: 'humanities-society', aliases: ['인문', '인문학'] },
  { slug: 'history-culture', name: '역사/문화', groupSlug: 'humanities-society', aliases: ['역사', '문화', '역사/문화'] },
  { slug: 'society-politics', name: '사회/정치', groupSlug: 'humanities-society', aliases: ['사회', '정치', '사회/정치', '사회과학'] },
  { slug: 'business-management', name: '경제/경영', groupSlug: 'humanities-society', aliases: ['경제', '경영', '경제/경영'] },
  { slug: 'self-development', name: '자기계발', groupSlug: 'humanities-society', aliases: ['자기계발'] },
  { slug: 'health', name: '건강', groupSlug: 'practical', aliases: ['건강'] },
  {
    slug: 'hobby-practical-sports',
    name: '취미/실용/스포츠',
    groupSlug: 'practical',
    aliases: ['취미', '실용', '스포츠', '취미/실용/스포츠', '건강/취미'],
  },
  { slug: 'travel', name: '여행', groupSlug: 'practical', aliases: ['여행'] },
  { slug: 'foreign-language', name: '외국어', groupSlug: 'practical', aliases: ['외국어', '영어'] },
  { slug: 'science', name: '과학', groupSlug: 'practical', aliases: ['과학', '과학/사회과학'] },
  { slug: 'computer-it', name: '컴퓨터/IT', groupSlug: 'practical', aliases: ['컴퓨터', 'IT', '컴퓨터/IT', '컴퓨터/모바일'] },
  { slug: 'arts-pop-culture', name: '예술/대중문화', groupSlug: 'practical', aliases: ['예술', '대중문화', '예술/대중문화'] },
  { slug: 'youth', name: '청소년', groupSlug: 'literature', aliases: ['청소년', '소설/청소년'] },
  { slug: 'infant', name: '유아', groupSlug: 'children-comics', aliases: ['유아'] },
  { slug: 'children', name: '어린이', groupSlug: 'children-comics', aliases: ['어린이'] },
  { slug: 'elementary-reference', name: '초등참고서', groupSlug: 'learning', aliases: ['초등참고서', '초등'] },
  {
    slug: 'secondary-reference',
    name: '중고등참고서',
    groupSlug: 'learning',
    aliases: ['중고등참고서', '중등참고서', '고등참고서', '중학참고서', '고교참고서', '중등', '고등'],
  },
  {
    slug: 'exam-license',
    name: '수험서/자격증',
    groupSlug: 'learning',
    aliases: ['수험서/자격증', '수험서', '자격증', '취업/수험서', '취업', '수험', '취업/수험'],
  },
] as const;

const FILTER_ALIAS_TO_DETAIL: Record<string, BookCategoryDetailSlug> = {
  novel: 'novel',
  essay: 'poetry-essay',
  humanities: 'humanities',
  business: 'business-management',
  science: 'science',
  it: 'computer-it',
  computer: 'computer-it',
  'middle-reference': 'secondary-reference',
  'high-reference': 'secondary-reference',
  'job-exam': 'exam-license',
  license: 'exam-license',
  comics: 'novel',
};

export const BOOK_CATEGORIES: ReadonlyArray<{ name: string; slug: BookCategoryGroupSlug }> = BOOK_CATEGORY_GROUPS.map(
  (group) => ({
    name: group.name,
    slug: group.slug,
  }),
);

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isBookCategoryGroupSlug(value: string | null | undefined): value is BookCategoryGroupSlug {
  return BOOK_CATEGORY_GROUPS.some((group) => group.slug === value);
}

export function isBookCategoryDetailSlug(value: string | null | undefined): value is BookCategoryDetailSlug {
  return BOOK_CATEGORY_DETAILS.some((detail) => detail.slug === value);
}

export function getBookCategoryGroup(groupSlug: BookCategoryGroupSlug): BookCategoryGroup | undefined {
  return BOOK_CATEGORY_GROUPS.find((group) => group.slug === groupSlug);
}

export function getBookCategoryDetail(detailSlug: BookCategoryDetailSlug): BookCategoryDetail | undefined {
  return BOOK_CATEGORY_DETAILS.find((detail) => detail.slug === detailSlug);
}

export function getBookCategoryDetailOptions(groupSlug: BookCategoryGroupSlug): BookCategoryDetail[] {
  const group = getBookCategoryGroup(groupSlug);
  if (!group) return [];

  return group.detailSlugs
    .map((slug) => getBookCategoryDetail(slug))
    .filter((value): value is BookCategoryDetail => Boolean(value));
}

export function resolveBookCategoryFilterSlug(raw: string | null | undefined): BookCategoryFilterSlug | null {
  const normalized = normalizeText(raw);
  if (!normalized) return null;

  const groupMatch = BOOK_CATEGORY_GROUPS.find(
    (group) =>
      normalizeText(group.slug) === normalized ||
      normalizeText(group.name) === normalized ||
      normalizeText(group.shortName) === normalized,
  );
  if (groupMatch) return groupMatch.slug;

  const detailMatch =
    BOOK_CATEGORY_DETAILS.find((detail) => normalizeText(detail.slug) === normalized) ??
    BOOK_CATEGORY_DETAILS.find(
      (detail) =>
        normalizeText(detail.name) === normalized ||
        detail.aliases.some((alias) => normalizeText(alias) === normalized),
    );
  if (detailMatch) return detailMatch.slug;

  return FILTER_ALIAS_TO_DETAIL[normalized] ?? null;
}

export function resolveStoredBookCategoryDetailSlug(raw: string | null | undefined): BookCategoryDetailSlug | null {
  const normalized = normalizeText(raw);
  if (!normalized) return null;

  const detailMatch =
    BOOK_CATEGORY_DETAILS.find((detail) => normalizeText(detail.name) === normalized) ??
    BOOK_CATEGORY_DETAILS.find((detail) => detail.aliases.some((alias) => normalizeText(alias) === normalized));
  if (detailMatch) return detailMatch.slug;

  return FILTER_ALIAS_TO_DETAIL[normalized] ?? null;
}

export function getBookCategoryDisplayName(raw: string | null | undefined): string {
  const detailSlug = resolveStoredBookCategoryDetailSlug(raw);
  if (!detailSlug) return String(raw ?? '').trim();
  return getBookCategoryDetail(detailSlug)?.name ?? String(raw ?? '').trim();
}

export function getBookCategoryGroupSlugForStoredCategory(raw: string | null | undefined): BookCategoryGroupSlug | null {
  const detailSlug = resolveStoredBookCategoryDetailSlug(raw);
  if (!detailSlug) return null;
  return getBookCategoryDetail(detailSlug)?.groupSlug ?? null;
}

export function matchesBookCategoryFilter(
  bookCategory: string | null | undefined,
  filterSlug: string | null | undefined,
): boolean {
  const resolvedFilter = resolveBookCategoryFilterSlug(filterSlug);
  if (!resolvedFilter) return false;

  const detailSlug = resolveStoredBookCategoryDetailSlug(bookCategory);
  if (!detailSlug) return false;

  if (isBookCategoryGroupSlug(resolvedFilter)) {
    return getBookCategoryDetail(detailSlug)?.groupSlug === resolvedFilter;
  }

  return detailSlug === resolvedFilter;
}
