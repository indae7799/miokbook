'use client';

import type { BookFilters } from '@online-miok/schemas';
import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookSearch, type SearchResponse } from '@/hooks/useBookSearch';
import EmptyState from '@/components/common/EmptyState';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import { BOOK_CATEGORIES } from '@/lib/categories';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import StoreFooter from '@/components/home/StoreFooter';
import BooksResultsLoading from '@/components/books/BooksResultsLoading';

function buildBooksQueryString(f: Partial<BookFilters>): string {
  const p = new URLSearchParams();
  if (f.keyword) p.set('keyword', f.keyword);
  if (f.category) p.set('category', f.category);
  if ((f.page ?? 1) > 1) p.set('page', String(f.page));
  if (f.sort && f.sort !== 'latest') p.set('sort', f.sort);
  return p.toString();
}

const CATEGORIES = [
  { value: '', label: '전체' },
  ...BOOK_CATEGORIES.map((c) => ({ value: c.slug, label: c.name })),
  { value: '기타', label: '기타' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'price_asc', label: '낮은 가격순' },
  { value: 'price_desc', label: '높은 가격순' },
  { value: 'rating', label: '평점순' },
];

const PAGE_SIZE = 20;
const MAX_VISIBLE_PAGES = 5;

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= MAX_VISIBLE_PAGES + 2) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  let start = Math.max(2, current - Math.floor(MAX_VISIBLE_PAGES / 2));
  const end = Math.min(total - 1, start + MAX_VISIBLE_PAGES - 1);
  if (end === total - 1) start = Math.max(2, end - MAX_VISIBLE_PAGES + 1);
  if (start > 2) pages.push('ellipsis');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

interface BooksPageClientProps {
  initialFilters: Partial<BookFilters>;
  initialData: SearchResponse;
}

/** URL 쿼리가 단일 출처 — 카테고리 클릭 직후 서버 props가 늦어져 필터가 초기화되던 문제 방지 */
function BooksPageClientInner({ initialFilters, initialData }: BooksPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlKey = searchParams.toString();

  const filtersFromUrl = useMemo((): BookFilters => {
    const sortParam = searchParams.get('sort');
    const sort =
      sortParam && ['latest', 'price_asc', 'price_desc', 'rating'].includes(sortParam)
        ? (sortParam as BookFilters['sort'])
        : 'latest';
    return {
      keyword: searchParams.get('keyword') ?? searchParams.get('q') ?? undefined,
      category: searchParams.get('category') || undefined,
      page: Math.max(1, Number(searchParams.get('page') || 1)),
      pageSize: PAGE_SIZE,
      sort,
    };
  }, [urlKey, searchParams]);

  const { books, isLoading, isFetching, totalCount, filters, setFilters } = useBookSearch({
    initialFilters: {
      pageSize: PAGE_SIZE,
      sort: 'latest',
      ...initialFilters,
    },
    initialData,
  });

  useEffect(() => {
    setFilters((prev) => {
      if (
        (prev.category ?? '') === (filtersFromUrl.category ?? '') &&
        (prev.page ?? 1) === (filtersFromUrl.page ?? 1) &&
        (prev.sort ?? 'latest') === (filtersFromUrl.sort ?? 'latest') &&
        (prev.keyword ?? '') === (filtersFromUrl.keyword ?? '') &&
        (prev.pageSize ?? PAGE_SIZE) === (filtersFromUrl.pageSize ?? PAGE_SIZE)
      ) {
        return prev;
      }
      return { ...filtersFromUrl };
    });
  }, [filtersFromUrl, setFilters]);

  const applyFilters = (next: Partial<BookFilters>) => {
    const merged = { ...filters, ...next };
    setFilters(next);
    const qs = buildBooksQueryString(merged);
    const url = qs ? `/books?${qs}` : '/books';
    router.replace(url, { scroll: false });
  };

  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const keyword = filters.keyword ?? '';
  const pageNumbers = buildPageNumbers(page, totalPages);

  const resultsKey = [
    filters.category ?? '',
    String(filters.page ?? 1),
    filters.sort ?? 'latest',
    filters.keyword ?? '',
  ].join('|');

  const listEmpty = books.length === 0;
  const listLoadingOverlay = listEmpty && isFetching;

  return (
    <>
    <main className="min-h-screen pt-6 pb-2 max-w-[1200px] mx-auto px-4">
      {/* Search + Results count */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold shrink-0">도서 검색</h1>
          {keyword && !isLoading && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">&apos;{keyword}&apos;</span>
              {' '}검색 결과{' '}
              <span className="font-semibold text-primary">{totalCount.toLocaleString()}</span>건
            </p>
          )}
        </div>

        {/* 본문 검색창은 헤더 고정식 검색창으로 통합되어 제거됨 */}

        {/* Category pills — 버튼 클릭 시 즉시 setFilters, 클라이언트 fetch */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = (filters.category ?? '') === c.value;
            return (
              <button
                key={c.value || 'all'}
                type="button"
                className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors border ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => applyFilters({ category: c.value || undefined, page: 1 })}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Sort tabs + 페이지네이션 한 행 */}
        <div className="flex items-center border-b border-border">
          {/* 정렬 탭 — 모바일에서 가로 스크롤 */}
          <div className="overflow-x-auto flex-1 min-w-0 scrollbar-hide">
            <div className="flex items-center gap-0 min-w-max">
              {SORT_OPTIONS.map((s) => {
                const active = (filters.sort ?? 'latest') === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                      active
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }`}
                    onClick={() =>
                      applyFilters({
                        sort: s.value as 'latest' | 'price_asc' | 'price_desc' | 'rating',
                        page: 1,
                      })
                    }
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 페이지네이션 — 우측 끝 (sm 이상에서만 표시) */}
          {totalPages > 1 && (
            <nav className="hidden sm:flex ml-auto items-center gap-0.5 pb-px shrink-0" aria-label="페이지 이동">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!hasPrev}
                onClick={() => applyFilters({ page: page - 1 })}
                aria-label="이전 페이지"
              >
                <ChevronLeft className="size-4" />
              </Button>

              {pageNumbers.map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="w-7 text-center text-sm text-muted-foreground select-none">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'ghost'}
                    size="icon"
                    className="size-8 text-sm"
                    onClick={() => p !== page && applyFilters({ page: p })}
                    aria-current={p === page ? 'page' : undefined}
                  >
                    {p}
                  </Button>
                ),
              )}

              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!hasNext}
                onClick={() => applyFilters({ page: page + 1 })}
                aria-label="다음 페이지"
              >
                <ChevronRight className="size-4" />
              </Button>
            </nav>
          )}
        </div>
      </div>


      {/* 탭별 도서: 로딩 중엔 같은 자리에 오버레이 스피너 → 수신 후 한 번에 페이드인 */}
      <div className="relative min-h-[min(55vh,480px)]">
        {listLoadingOverlay ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/75 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
            aria-label="검색 결과 로딩 중"
          >
            <Loader2 className="size-8 animate-spin text-muted-foreground/80" strokeWidth={1.75} aria-hidden />
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          </div>
        ) : null}

        {listEmpty && !isFetching ? (
          <EmptyState
            title="검색 결과가 없습니다"
            message="다른 키워드나 카테고리로 검색해 보세요."
          />
        ) : !listEmpty ? (
          <>
            <div
              key={resultsKey}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 animate-books-results-in"
            >
              {books.map((book, index) => (
                <div
                  key={book.isbn}
                  className={`p-1 sm:p-1.5 ${index >= 18 ? 'hidden sm:block' : ''}`}
                >
                  <BookCard book={book} compact showCart={false} hidePrice={true} priority={index < 12} smallerCover80 />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="sm:hidden flex justify-center items-center gap-1 pt-6 pb-2" aria-label="페이지 이동">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  disabled={!hasPrev}
                  onClick={() => applyFilters({ page: page - 1 })}
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {pageNumbers.map((p, idx) =>
                  p === 'ellipsis' ? (
                    <span key={`em-${idx}`} className="w-8 text-center text-sm text-muted-foreground select-none">
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'ghost'}
                      size="icon"
                      className="size-9 text-sm"
                      onClick={() => p !== page && applyFilters({ page: p })}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </Button>
                  ),
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  disabled={!hasNext}
                  onClick={() => applyFilters({ page: page + 1 })}
                  aria-label="다음 페이지"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </nav>
            )}
          </>
        ) : null}
      </div>
    </main>
    <StoreFooter />
    </>
  );
}

export default function BooksPageClient(props: BooksPageClientProps) {
  return (
    <Suspense
      fallback={
        <>
          <main className="min-h-screen pt-6 pb-2 max-w-[1200px] mx-auto px-4">
            <h1 className="mb-6 text-2xl font-bold shrink-0">도서 검색</h1>
            <BooksResultsLoading />
          </main>
          <StoreFooter />
        </>
      }
    >
      <BooksPageClientInner {...props} />
    </Suspense>
  );
}
