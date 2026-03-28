'use client';

import type { BookFilters } from '@online-miok/schemas';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useBookSearch, type SearchResponse } from '@/hooks/useBookSearch';
import EmptyState from '@/components/common/EmptyState';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import {
  BOOK_CATEGORY_GROUPS,
  getBookCategoryDetailOptions,
  isBookCategoryDetailSlug,
  isBookCategoryGroupSlug,
  type BookCategoryGroupSlug,
  resolveBookCategoryFilterSlug,
} from '@/lib/categories';
import StoreFooter from '@/components/home/StoreFooter';
import BooksResultsLoading from '@/components/books/BooksResultsLoading';

function buildBooksQueryString(filters: Partial<BookFilters>): string {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.category) params.set('category', filters.category);
  if ((filters.page ?? 1) > 1) params.set('page', String(filters.page));
  if (filters.sort && filters.sort !== 'latest') params.set('sort', filters.sort);
  return params.toString();
}

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'price_asc', label: '낮은가격순' },
  { value: 'price_desc', label: '높은가격순' },
  { value: 'rating', label: '평점순' },
] as const;

const PAGE_SIZE = 20;
const MAX_VISIBLE_PAGES = 5;

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= MAX_VISIBLE_PAGES + 2) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];
  let start = Math.max(2, current - Math.floor(MAX_VISIBLE_PAGES / 2));
  const end = Math.min(total - 1, start + MAX_VISIBLE_PAGES - 1);

  if (end === total - 1) start = Math.max(2, end - MAX_VISIBLE_PAGES + 1);
  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push('ellipsis');
  pages.push(total);

  return pages;
}

interface BooksPageClientProps {
  initialFilters: Partial<BookFilters>;
  initialData: SearchResponse;
}

function CategoryTree({
  selectedCategory,
  openGroup,
  onToggleGroup,
  onSelectCategory,
}: {
  selectedCategory?: string;
  openGroup: BookCategoryGroupSlug | null;
  onToggleGroup: (groupSlug: BookCategoryGroupSlug) => void;
  onSelectCategory: (category?: string) => void;
}) {
  const resolvedSelected = resolveBookCategoryFilterSlug(selectedCategory ?? '');

  return (
    <div className="space-y-2">
      {BOOK_CATEGORY_GROUPS.map((group) => {
        const details = getBookCategoryDetailOptions(group.slug);
        const isGroupSelected = resolvedSelected === group.slug;
        const isDetailSelected = isBookCategoryDetailSlug(resolvedSelected)
          ? details.some((detail) => detail.slug === resolvedSelected)
          : false;
        const isOpen = openGroup === group.slug || isGroupSelected || isDetailSelected;

        return (
          <div key={group.slug} className="border-b border-border/70 pb-2 last:border-b-0">
            <button
              type="button"
              onClick={() => {
                onSelectCategory(group.slug);
                onToggleGroup(group.slug);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                isGroupSelected || isDetailSelected
                  ? 'font-semibold text-foreground'
                  : 'text-foreground hover:bg-muted/70'
              }`}
            >
              <span>{group.name}</span>
              <ChevronDown className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen ? (
              <div className="mt-1 space-y-1 pl-3">
                {details.map((detail) => (
                  <button
                    key={detail.slug}
                    type="button"
                    onClick={() => onSelectCategory(detail.slug)}
                    className={`w-full rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                      resolvedSelected === detail.slug
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    {detail.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

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
  }, [searchParams, urlKey]);

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

  const selectedCategory = filters.category;
  const resolvedSelectedCategory = resolveBookCategoryFilterSlug(selectedCategory ?? '');
  const inferredOpenGroup =
    resolvedSelectedCategory && isBookCategoryDetailSlug(resolvedSelectedCategory)
      ? BOOK_CATEGORY_GROUPS.find((group) =>
          getBookCategoryDetailOptions(group.slug).some((detail) => detail.slug === resolvedSelectedCategory),
        )?.slug ?? null
      : null;

  const [openGroup, setOpenGroup] = useState<BookCategoryGroupSlug | null>(null);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);

  useEffect(() => {
    setOpenGroup(inferredOpenGroup);
  }, [inferredOpenGroup]);

  const applyFilters = (next: Partial<BookFilters>) => {
    const merged = { ...filters, ...next };
    setFilters(next);
    const queryString = buildBooksQueryString(merged);
    const nextUrl = queryString ? `/books?${queryString}` : '/books';
    router.replace(nextUrl);
  };

  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const keyword = filters.keyword ?? '';
  const pageNumbers = buildPageNumbers(page, totalPages);
  const resultsKey = [filters.category ?? '', String(filters.page ?? 1), filters.sort ?? 'latest', filters.keyword ?? ''].join('|');
  const listEmpty = books.length === 0;
  const showLoadingOverlay = listEmpty && isFetching;

  const selectCategory = (category?: string) => {
    applyFilters({ category, page: 1 });
    setMobileCategoryOpen(false);
  };

  const currentCategoryLabel = (() => {
    if (!resolvedSelectedCategory) return '카테고리';
    if (isBookCategoryGroupSlug(resolvedSelectedCategory)) {
      return BOOK_CATEGORY_GROUPS.find((group) => group.slug === resolvedSelectedCategory)?.name ?? '카테고리';
    }

    if (isBookCategoryDetailSlug(resolvedSelectedCategory)) {
      for (const group of BOOK_CATEGORY_GROUPS) {
        const detail = getBookCategoryDetailOptions(group.slug).find((item) => item.slug === resolvedSelectedCategory);
        if (detail) return detail.name;
      }
    }

    return '카테고리';
  })();

  return (
    <>
      <main className="mx-auto min-h-screen max-w-[1280px] px-4 pb-2 pt-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          {keyword && !isLoading ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">&apos;{keyword}&apos;</span> 검색 결과{' '}
              <span className="font-semibold text-primary">{totalCount.toLocaleString()}</span>건
            </p>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="outline" size="sm" onClick={() => setMobileCategoryOpen((prev) => !prev)}>
              {currentCategoryLabel}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-border bg-background p-4">
              <h2 className="mb-4 text-lg font-semibold">카테고리</h2>
              <CategoryTree
                selectedCategory={selectedCategory}
                openGroup={openGroup}
                onToggleGroup={(groupSlug) => setOpenGroup((prev) => (prev === groupSlug ? null : groupSlug))}
                onSelectCategory={selectCategory}
              />
            </div>
          </aside>

          <section className="min-w-0">
            {mobileCategoryOpen ? (
              <div className="mb-4 rounded-2xl border border-border bg-background p-4 lg:hidden">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold">카테고리</h2>
                  <Button variant="ghost" size="sm" onClick={() => setMobileCategoryOpen(false)}>
                    닫기
                  </Button>
                </div>
                <CategoryTree
                  selectedCategory={selectedCategory}
                  openGroup={openGroup}
                  onToggleGroup={(groupSlug) => setOpenGroup((prev) => (prev === groupSlug ? null : groupSlug))}
                  onSelectCategory={selectCategory}
                />
              </div>
            ) : null}

            <div className="mb-4 px-1 sm:px-1.5">
              <div className="border-b border-border">
                <div className="flex items-center">
                  <div className="scrollbar-hide min-w-0 flex-1 overflow-x-auto">
                    <div className="flex min-w-max items-center gap-0">
                      {SORT_OPTIONS.map((sortOption) => {
                        const active = (filters.sort ?? 'latest') === sortOption.value;

                        return (
                          <button
                            key={sortOption.value}
                            type="button"
                            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                              active
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                            }`}
                            onClick={() =>
                              applyFilters({
                                sort: sortOption.value as 'latest' | 'price_asc' | 'price_desc' | 'rating',
                                page: 1,
                              })
                            }
                          >
                            {sortOption.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {totalPages > 1 ? (
                    <nav className="ml-auto hidden shrink-0 items-center gap-0.5 pb-px sm:flex" aria-label="페이지 이동">
                      <Button variant="ghost" size="icon" className="size-8" disabled={!hasPrev} onClick={() => applyFilters({ page: page - 1 })}>
                        <ChevronLeft className="size-4" />
                      </Button>
                      {pageNumbers.map((pageNumber, index) =>
                        pageNumber === 'ellipsis' ? (
                          <span key={`ellipsis-${index}`} className="w-7 select-none text-center text-sm text-muted-foreground">
                            …
                          </span>
                        ) : (
                          <Button
                            key={pageNumber}
                            variant={pageNumber === page ? 'default' : 'ghost'}
                            size="icon"
                            className="size-8 text-sm"
                            onClick={() => pageNumber !== page && applyFilters({ page: pageNumber })}
                          >
                            {pageNumber}
                          </Button>
                        ),
                      )}
                      <Button variant="ghost" size="icon" className="size-8" disabled={!hasNext} onClick={() => applyFilters({ page: page + 1 })}>
                        <ChevronRight className="size-4" />
                      </Button>
                    </nav>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative min-h-[min(55vh,480px)]">
              {showLoadingOverlay ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/75 backdrop-blur-[2px]" role="status" aria-live="polite">
                  <Loader2 className="size-8 animate-spin text-muted-foreground/80" strokeWidth={1.75} aria-hidden />
                  <p className="text-sm text-muted-foreground">불러오는 중입니다.</p>
                </div>
              ) : null}

              {listEmpty && !isFetching ? (
                <EmptyState title="검색 결과가 없습니다" message="다른 키워드나 카테고리로 검색해 보세요." />
              ) : (
                <>
                  <div key={resultsKey} className="grid animate-books-results-in grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
                    {books.map((book, index) => (
                      <div key={book.isbn} className={`p-1 sm:p-1.5 ${index >= 18 ? 'hidden sm:block' : ''}`}>
                        <BookCard book={book} compact showCart={false} hidePrice priority={index < 12} smallerCover80 />
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 ? (
                    <nav className="flex items-center justify-center gap-1 pb-2 pt-6 sm:hidden" aria-label="페이지 이동">
                      <Button variant="ghost" size="icon" className="size-9" disabled={!hasPrev} onClick={() => applyFilters({ page: page - 1 })}>
                        <ChevronLeft className="size-4" />
                      </Button>
                      {pageNumbers.map((pageNumber, index) =>
                        pageNumber === 'ellipsis' ? (
                          <span key={`mobile-ellipsis-${index}`} className="w-8 select-none text-center text-sm text-muted-foreground">
                            …
                          </span>
                        ) : (
                          <Button
                            key={pageNumber}
                            variant={pageNumber === page ? 'default' : 'ghost'}
                            size="icon"
                            className="size-9 text-sm"
                            onClick={() => pageNumber !== page && applyFilters({ page: pageNumber })}
                          >
                            {pageNumber}
                          </Button>
                        ),
                      )}
                      <Button variant="ghost" size="icon" className="size-9" disabled={!hasNext} onClick={() => applyFilters({ page: page + 1 })}>
                        <ChevronRight className="size-4" />
                      </Button>
                    </nav>
                  ) : null}
                </>
              )}
            </div>
          </section>
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
          <main className="mx-auto min-h-screen max-w-[1280px] px-4 pb-2 pt-6">
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
