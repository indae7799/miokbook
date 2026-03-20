'use client';

import type { BookFilters } from '@online-miok/schemas';
import { useRouter } from 'next/navigation';
import { useBookSearch, type SearchResponse } from '@/hooks/useBookSearch';
import EmptyState from '@/components/common/EmptyState';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BOOK_CATEGORIES } from '@/lib/categories';
import { Search, ChevronLeft, ChevronRight, BookOpenCheck } from 'lucide-react';
import StoreFooter from '@/components/home/StoreFooter';

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

export default function BooksPageClient({ initialFilters, initialData }: BooksPageClientProps) {
  const router = useRouter();
  const { books, isLoading, isFetching, totalCount, fromAladin, filters, setFilters } = useBookSearch({
    initialFilters: {
      pageSize: PAGE_SIZE,
      sort: 'latest',
      ...initialFilters,
    },
    initialData,
  });

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
          {/* 정렬 탭 */}
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map((s) => {
              const active = (filters.sort ?? 'latest') === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
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

          {/* 페이지네이션 — 우측 끝 */}
          {totalPages > 1 && (
            <nav className="ml-auto flex items-center gap-0.5 pb-px" aria-label="페이지 이동">
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

      {/* Aladin badge */}
      {fromAladin && books.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-2">
          <BookOpenCheck className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            알라딘 검색 결과입니다. DB에 등록된 도서가 없어 외부 데이터를 표시합니다.
          </p>
        </div>
      )}

      {/* 탭별 도서: 한 행 5권 그리드, 장바구니 없음 */}
      {isLoading && !books.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="p-1.5">
              <div className="rounded overflow-hidden animate-pulse">
                <div className="aspect-[188/254] bg-muted" />
                <div className="p-2 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          title="검색 결과가 없습니다"
          message="다른 키워드나 카테고리로 검색해 보세요."
        />
      ) : (
        <>
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 transition-opacity duration-150 ${
              isFetching ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {books.map((book, index) => (
              <div key={book.isbn} className="p-1.5">
                <BookCard book={book} compact showCart={false} hidePrice={true} priority={index < 6} />
              </div>
            ))}
          </div>

        </>
      )}
    </main>
    <StoreFooter />
    </>
  );
}
