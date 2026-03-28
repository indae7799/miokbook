'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import BookCard from '@/components/books/BookCard';
import StoreFooter from '@/components/home/StoreFooter';
import { Button } from '@/components/ui/button';
import {
  BOOK_CATEGORY_GROUPS,
  getBookCategoryDetailOptions,
  isBookCategoryDetailSlug,
  isBookCategoryGroupSlug,
  matchesBookCategoryFilter,
  resolveBookCategoryFilterSlug,
  type BookCategoryGroupSlug,
} from '@/lib/categories';
import type { BestsellerListingBook } from '@/lib/store/book-list-pages';

const PAGE_SIZE = 20;
const MAX_VISIBLE_PAGES = 5;

function buildBestsellersQuery(category?: string, pageNum?: number): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (pageNum && pageNum > 1) params.set('page', String(pageNum));
  return params.toString();
}

function goBestsellers(router: ReturnType<typeof useRouter>, category?: string, pageNum = 1) {
  const queryString = buildBestsellersQuery(category, pageNum);
  router.replace(queryString ? `/bestsellers?${queryString}` : '/bestsellers');
}

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

function BestsellersPageClientInner({ books }: { books: BestsellerListingBook[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlKey = searchParams.toString();

  const category = useMemo(() => (searchParams.get('category') ?? '').trim(), [searchParams, urlKey]);
  const pageRaw = useMemo(() => Math.max(1, Number(searchParams.get('page') || 1)), [searchParams, urlKey]);
  const resolvedSelectedCategory = resolveBookCategoryFilterSlug(category);
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

  const filteredBooks = useMemo(() => {
    if (!category) return books;
    return books.filter((book) => matchesBookCategoryFilter(book.category ?? '', category));
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

  const selectCategory = (nextCategory?: string) => {
    goBestsellers(router, nextCategory, 1);
    setMobileCategoryOpen(false);
  };

  return (
    <>
      <main className="mx-auto min-h-screen max-w-[1280px] px-4 pb-2 pt-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-muted-foreground">
            베스트셀러 <span className="font-semibold text-primary">{filteredBooks.length.toLocaleString()}</span>권
          </p>

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
                selectedCategory={category}
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
                  selectedCategory={category}
                  openGroup={openGroup}
                  onToggleGroup={(groupSlug) => setOpenGroup((prev) => (prev === groupSlug ? null : groupSlug))}
                  onSelectCategory={selectCategory}
                />
              </div>
            ) : null}

            <div className="mb-4 px-1 sm:px-1.5">
              <div className="border-b border-border">
                <div className="flex items-center">
                  <div className="min-w-0 flex-1" aria-hidden />
                  {totalPages > 1 ? (
                    <nav className="ml-auto hidden shrink-0 items-center gap-0.5 pb-px sm:flex" aria-label="페이지 이동">
                      <Button variant="ghost" size="icon" className="size-8" disabled={!hasPrev} onClick={() => goBestsellers(router, category || undefined, page - 1)}>
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
                            onClick={() => pageNumber !== page && goBestsellers(router, category || undefined, pageNumber)}
                          >
                            {pageNumber}
                          </Button>
                        ),
                      )}
                      <Button variant="ghost" size="icon" className="size-8" disabled={!hasNext} onClick={() => goBestsellers(router, category || undefined, page + 1)}>
                        <ChevronRight className="size-4" />
                      </Button>
                    </nav>
                  ) : null}
                </div>
              </div>
            </div>

            {pagedBooks.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">표시할 도서가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
                {pagedBooks.map((book, index) => (
                  <div key={book.isbn} className={`p-1 sm:p-1.5 ${index >= 18 ? 'hidden sm:block' : ''}`}>
                    <BookCard
                      compact
                      showCart={false}
                      priority={index < 10}
                      rank={(page - 1) * PAGE_SIZE + index + 1}
                      book={{
                        isbn: book.isbn,
                        slug: book.slug,
                        title: book.title,
                        author: book.author,
                        coverImage: book.coverImage,
                        listPrice: book.listPrice,
                        salePrice: book.salePrice,
                        category: book.category,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 ? (
              <nav className="flex items-center justify-center gap-1 pb-2 pt-6 sm:hidden" aria-label="페이지 이동">
                <Button variant="ghost" size="icon" className="size-9" disabled={!hasPrev} onClick={() => goBestsellers(router, category || undefined, page - 1)}>
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
                      onClick={() => pageNumber !== page && goBestsellers(router, category || undefined, pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ),
                )}
                <Button variant="ghost" size="icon" className="size-9" disabled={!hasNext} onClick={() => goBestsellers(router, category || undefined, page + 1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </nav>
            ) : null}
          </section>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}

export default function BestsellersPageClient({ books }: { books: BestsellerListingBook[] }) {
  return (
    <Suspense fallback={null}>
      <BestsellersPageClientInner books={books} />
    </Suspense>
  );
}
