import type { BookFilters } from '@online-miok/schemas';
import { searchBooksData } from '@/lib/store/search';
import BooksPageClient from '@/app/(store)/books/BooksPageClient';

const PAGE_SIZE = 20;

/**
 * 도서 목록 ISR 캐싱.
 * Meilisearch가 검색/정렬을 처리하지만, 초기 SSR 데이터는 캐싱.
 * 개발: 5분 / 프로덕션: 10분 (도서 목록은 자주 바뀌지 않음)
 */
export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 600;

export default async function BooksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const keywordParam =
    typeof params.keyword === 'string'
      ? params.keyword
      : typeof params.q === 'string'
        ? params.q
        : undefined;
  const initialFilters: Partial<BookFilters> = {
    keyword: keywordParam,
    category: typeof params.category === 'string' ? params.category : undefined,
    sort: typeof params.sort === 'string' && ['latest', 'price_asc', 'price_desc', 'rating'].includes(params.sort)
      ? (params.sort as BookFilters['sort'])
      : 'latest',
    page: typeof params.page === 'string' ? Math.max(1, Number(params.page) || 1) : 1,
    pageSize: PAGE_SIZE,
  };
  const initialData = await searchBooksData(initialFilters as BookFilters);

  return <BooksPageClient initialFilters={initialFilters} initialData={initialData} />;
}
