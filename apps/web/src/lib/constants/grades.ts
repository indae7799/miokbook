export const GRADE_KEYS = [
  { key: 'e1' as const, label: '초 1학년' },
  { key: 'e2' as const, label: '초 2학년' },
  { key: 'e3' as const, label: '초 3학년' },
  { key: 'e4' as const, label: '초 4학년' },
  { key: 'e5' as const, label: '초 5학년' },
  { key: 'e5p' as const, label: '초 5-3%' },
  { key: 'e6' as const, label: '초 6학년' },
  { key: 'e6p' as const, label: '초 6-3%' },
  { key: 'm1' as const, label: '중 1학년' },
  { key: 'm2' as const, label: '중 2학년' },
  { key: 'm3' as const, label: '중 3학년' },
] as const;

export type GradeKey = typeof GRADE_KEYS[number]['key'];

/** 스토어 탭: 초5=e5+e5p, 초6=e6+e6p 합산, 기본 탭 = 초5 */
export const GRADE_TABS = [
  { key: 'e1' as const, label: '초 1학년', grades: ['e1'] as GradeKey[] },
  { key: 'e2' as const, label: '초 2학년', grades: ['e2'] as GradeKey[] },
  { key: 'e3' as const, label: '초 3학년', grades: ['e3'] as GradeKey[] },
  { key: 'e4' as const, label: '초 4학년', grades: ['e4'] as GradeKey[] },
  { key: 'e5' as const, label: '초 5학년', grades: ['e5', 'e5p'] as GradeKey[] },
  { key: 'e6' as const, label: '초 6학년', grades: ['e6', 'e6p'] as GradeKey[] },
  { key: 'm1' as const, label: '중 1학년', grades: ['m1'] as GradeKey[] },
  { key: 'm2' as const, label: '중 2학년', grades: ['m2'] as GradeKey[] },
  { key: 'm3' as const, label: '중 3학년', grades: ['m3'] as GradeKey[] },
] as const;

export const DEFAULT_GRADE_TAB = 'e5' as const;

/** 홈 랜딩 선정도서: 학년 순으로 합친 뒤 최대 노출(5학년 탭만 쓰지 않음) */
export const HOME_LANDING_SELECTED_BOOK_COUNT = 12;

/** /selected-books — 학년 탭 선택 시 기본 노출 권수 */
export const SELECTED_BOOKS_TAB_DISPLAY_COUNT = 8;
