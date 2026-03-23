'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BookCard from '@/components/books/BookCard';
import StoreFooter from '@/components/home/StoreFooter';
import { Button } from '@/components/ui/button';
import { BOOK_CATEGORIES } from '@/lib/categories';
import type { BestsellerListingBook } from '@/lib/store/book-list-pages';

const PAGE_SIZE = 20;
const MAX_VISIBLE_PAGES = 5;

/** 도서 검색(/books)과 동일한 카테고리 목록 — 전체 pill 없음 */
const BESTSELLER_CATEGORY_PILLS = [
  ...BOOK_CATEGORIES.map((c) => ({ value: c.slug, label: c.name })),
  { value: '기타', label: '기타' },
];

function normCategory(raw: string) {
  return raw.replace(/\s+/g, ' ').trim();
}

function buildBestsellersQuery(category?: string, pageNum?: number): string {
  const p = new URLSearchParams();
  if (category) p.set('category', category);
  if (pageNum && pageNum > 1) p.set('page', String(pageNum));
  return p.toString();
}

function goBestsellers(
  router: ReturnType<typeof useRouter>,
  category?: string,
  pageNum = 1,
) {
  const qs = buildBestsellersQuery(category, pageNum);
  router.replace(qs ? `/bestsellers?${qs}` : '/bestsellers', { scroll: false });
}

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

function BestsellersPageClientInner({ books }: { books: BestsellerListingBook[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlKey = searchParams.toString();

  const category = useMemo(() => (searchParams.get('category') ?? '').trim(), [urlKey, searchParams]);
  const pageRaw = useMemo(() => Math.max(1, Number(searchParams.get('page') || 1)), [urlKey, searchParams]);

  const filteredBooks = useMemo(() => {
    if (!category) return books;
    return books.filter((b) => normCategory(b.category ?? '') === category);
  }, [books, category]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const page = Math.min(pageRaw, totalPages);

  useEffect(() => {
    if (pageRaw > totalPages) {
      goBestsellers(router, category || undefined, totalPages);
    }
  }, [pageRaw, totalPages, category, router]);

  const pageNumbers = buildPageNumbers(page, totalPages);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const pagedBooks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBooks.slice(start, start + PAGE_SIZE);
  }, [filteredBooks, page]);

  return (
    <>
      <main className="min-h-screen pt-6 pb-2 max-w-[1200px] mx-auto px-4">
        <div className="mb-6 space-y-4">
          <h1 className="flex items-center gap-3 text-2xl font-bold leading-none tracking-tight text-foreground md:text-[30px]">
            <span className="home-section-title-bar h-[1em] w-1.5 shrink-0 md:w-2" aria-hidden />
            베스트셀러
          </h1>

          {/* 도서 검색(/books)과 동일한 카테고리 알약 — 전체 제외 */}
          <div className="flex flex-wrap gap-1.5">
            {BESTSELLER_CATEGORY_PILLS.map((c) => {
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => {
                    if (active) {
                      goBestsellers(router, undefined, 1);
                      return;
                    }
                    goBestsellers(router, c.value, 1);
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* 도서 검색과 동일: 하단 구분선(border-b) + sm 이상에서 페이지네이션 우측 */}
          <div className="flex items-center border-b border-border">
            <div className="min-w-0 flex-1" aria-hidden />
            {totalPages > 1 ? (
              <nav
                className="ml-auto hidden shrink-0 items-center gap-0.5 pb-px sm:flex"
                aria-label="페이지 이동"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={!hasPrev}
                  onClick={() => goBestsellers(router, category || undefined, page - 1)}
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {pageNumbers.map((pNum, idx) =>
                  pNum === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="w-7 select-none text-center text-sm text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={pNum}
                      variant={pNum === page ? 'default' : 'ghost'}
                      size="icon"
                      className="size-8 text-sm"
                      onClick={() => pNum !== page && goBestsellers(router, category || undefined, pNum)}
                      aria-current={pNum === page ? 'page' : undefined}
                    >
                      {pNum}
                    </Button>
                  ),
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={!hasNext}
                  onClick={() => goBestsellers(router, category || undefined, page + 1)}
                  aria-label="다음 페이지"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </nav>
            ) : null}
          </div>
        </div>

        {pagedBooks.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">표시할 도서가 없습니다.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 animate-books-results-in">
              {pagedBooks.map((book, index) => {
                const globalRank = (page - 1) * PAGE_SIZE + index + 1;
                return (
                  <div
                    key={book.isbn}
                    className={`p-1 sm:p-1.5 ${index >= 18 ? 'hidden sm:block' : ''}`}
                  >
                    <BookCard
                      book={book}
                      compact
                      showCart={false}
                      hidePrice
                      priority={index < 12}
                      smallerCover80
                      rank={globalRank <= 5 ? globalRank : undefined}
                    />
                  </div>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <nav
                className="flex items-center justify-center gap-1 pb-2 pt-6 sm:hidden"
                aria-label="페이지 이동"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  disabled={!hasPrev}
                  onClick={() => goBestsellers(router, category || undefined, page - 1)}
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {pageNumbers.map((pNum, idx) =>
                  pNum === 'ellipsis' ? (
                    <span key={`em-${idx}`} className="w-8 select-none text-center text-sm text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={pNum}
                      variant={pNum === page ? 'default' : 'ghost'}
                      size="icon"
                      className="size-9 text-sm"
                      onClick={() => pNum !== page && goBestsellers(router, category || undefined, pNum)}
                      aria-current={pNum === page ? 'page' : undefined}
                    >
                      {pNum}
                    </Button>
                  ),
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  disabled={!hasNext}
                  onClick={() => goBestsellers(router, category || undefined, page + 1)}
                  aria-label="다음 페이지"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </main>
      <StoreFooter />
    </>
  );
}

export default function BestsellersPageClient({ books }: { books: BestsellerListingBook[] }) {
  return (
    <Suspense
      fallback={
        <>
          <main className="min-h-screen pt-6 pb-2 max-w-[1200px] mx-auto px-4">
            <h1 className="flex items-center gap-3 text-2xl font-bold leading-none tracking-tight text-foreground md:text-[30px]">
              <span className="home-section-title-bar h-[1em] w-1.5 shrink-0 md:w-2" aria-hidden />
              베스트셀러
            </h1>
            <p className="mt-6 pl-[18px] text-sm text-muted-foreground md:pl-5">불러오는 중…</p>
          </main>
          <StoreFooter />
        </>
      }
    >
      <BestsellersPageClientInner books={books} />
    </Suspense>
  );
}
