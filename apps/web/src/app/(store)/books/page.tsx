'use client';

import { useBookSearch } from '@/hooks/useBookSearch';
import BookCard from '@/components/books/BookCard';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BOOK_CATEGORIES } from '@/lib/categories';

const CATEGORIES = [
  { value: '', label: '전체' },
  ...BOOK_CATEGORIES.map((c) => ({ value: c.slug, label: c.name })),
  { value: '기타', label: '기타' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'price_asc', label: '가격 낮은순' },
  { value: 'price_desc', label: '가격 높은순' },
  { value: 'rating', label: '평점순' },
];

const PAGE_SIZE = 12;

export default function BooksPage() {
  const { books, isLoading, totalCount, filters, setFilters } = useBookSearch({
    pageSize: PAGE_SIZE,
    sort: 'latest',
  });

  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return (
    <main className="min-h-screen pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4">도서 목록</h1>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <Input
            type="search"
            placeholder="제목, 저자로 검색"
            value={filters.keyword ?? ''}
            onChange={(e) => setFilters({ keyword: e.target.value, page: 1 })}
            className="min-h-[48px] max-w-xs"
          />
          <select
            value={filters.category ?? ''}
            onChange={(e) => setFilters({ category: e.target.value || undefined, page: 1 })}
            className="min-h-[48px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value || 'all'} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={filters.sort ?? 'latest'}
            onChange={(e) =>
              setFilters({
                sort: e.target.value as 'latest' | 'price_asc' | 'price_desc' | 'rating',
                page: 1,
              })
            }
            className="min-h-[48px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          title="검색 결과가 없습니다"
          message="다른 키워드나 카테고리로 검색해 보세요."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {books.map((book) => (
              <BookCard key={book.isbn} book={book} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="페이지 이동">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[48px] min-w-[48px]"
                disabled={!hasPrev}
                onClick={() => setFilters({ page: page - 1 })}
              >
                이전
              </Button>
              <span className="text-sm text-muted-foreground px-2 min-h-[48px] flex items-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[48px] min-w-[48px]"
                disabled={!hasNext}
                onClick={() => setFilters({ page: page + 1 })}
              >
                다음
              </Button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
