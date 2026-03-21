'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BookFilters } from '@online-miok/schemas';
import { queryKeys } from '@/lib/queryKeys';

export interface BookSearchItem {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
}

interface SearchResponse {
  books: BookSearchItem[];
  totalCount: number;
  fromAladin?: boolean;
}
export type { SearchResponse };

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/** `/books` 목록과 동일 (API·SSR과 맞춤) */
const PAGE_SIZE = 20;

async function fetchSearch(filters: BookFilters, signal?: AbortSignal): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.category) params.set('category', filters.category);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.status) params.set('status', filters.status);

  const res = await fetch(`/api/search?${params.toString()}`, { signal });
  if (!res.ok) throw new Error('Search failed');
  const json = await res.json();
  return {
    books: json.books ?? json.data?.hits ?? [],
    totalCount: json.totalCount ?? json.data?.totalHits ?? 0,
    fromAladin: json.fromAladin ?? false,
  };
}

const defaultFilters: BookFilters = {
  page: 1,
  pageSize: PAGE_SIZE,
  sort: 'latest',
};

export function useBookSearch(options?: {
  initialFilters?: Partial<BookFilters>;
  initialData?: SearchResponse;
}) {
  const [filters, setFilters] = useState<BookFilters>({
    ...defaultFilters,
    ...(options?.initialFilters ?? {}),
  });
  const debouncedKeyword = useDebounce(filters.keyword ?? '', 200);
  const queryFilters: BookFilters = { ...filters, keyword: debouncedKeyword || undefined };

  /** URL(서버)과 같은 필터일 때만 SSR initialData 사용 — 탭 바꿀 때 온전체 목록이 잠깐 보이는 현상 방지 */
  const ssr = options?.initialFilters;
  const useSsrInitial =
    !!options?.initialData &&
    (ssr?.category ?? '') === (queryFilters.category ?? '') &&
    (ssr?.page ?? 1) === (queryFilters.page ?? 1) &&
    (ssr?.sort ?? 'latest') === (queryFilters.sort ?? 'latest') &&
    (ssr?.keyword ?? '') === (queryFilters.keyword ?? '') &&
    (ssr?.pageSize ?? PAGE_SIZE) === (queryFilters.pageSize ?? PAGE_SIZE);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.books.list(queryFilters),
    queryFn: ({ signal }) => fetchSearch(queryFilters, signal),
    initialData: useSsrInitial ? options?.initialData : undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    /** 카테고리·정렬·검색어·페이지가 바뀌면 이전 탭 목록을 보여주지 않음 → 탭 전환 시 맞는 도서만 */
    placeholderData: (previousData, previousQuery) => {
      if (!previousData || !previousQuery?.queryKey) return undefined;
      const prev = previousQuery.queryKey[2] as BookFilters;
      const next = queryFilters;
      const same =
        (prev.category ?? '') === (next.category ?? '') &&
        (prev.page ?? 1) === (next.page ?? 1) &&
        (prev.sort ?? 'latest') === (next.sort ?? 'latest') &&
        (prev.keyword ?? '') === (next.keyword ?? '') &&
        (prev.pageSize ?? PAGE_SIZE) === (next.pageSize ?? PAGE_SIZE);
      return same ? previousData : undefined;
    },
    refetchOnWindowFocus: false,
  });

  const books = data?.books ?? [];
  const totalCount = data?.totalCount ?? 0;
  const fromAladin = data?.fromAladin ?? false;

  const setFiltersMerge = useCallback(
    (next: Partial<BookFilters> | ((prev: BookFilters) => BookFilters)) => {
      setFilters((prev) => (typeof next === 'function' ? next(prev) : { ...prev, ...next }));
    },
    [],
  );

  return {
    books,
    isLoading,
    isFetching,
    totalCount,
    fromAladin,
    filters,
    setFilters: setFiltersMerge,
  };
}
