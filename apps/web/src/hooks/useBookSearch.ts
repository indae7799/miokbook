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
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

async function fetchSearch(filters: BookFilters): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.category) params.set('category', filters.category);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.status) params.set('status', filters.status);

  const res = await fetch(`/api/search?${params.toString()}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

const defaultFilters: BookFilters = {
  page: 1,
  pageSize: 12,
  sort: 'latest',
};

export function useBookSearch(initialFilters?: Partial<BookFilters>) {
  const [filters, setFilters] = useState<BookFilters>({ ...defaultFilters, ...initialFilters });
  const debouncedKeyword = useDebounce(filters.keyword ?? '', 300);
  const queryFilters: BookFilters = { ...filters, keyword: debouncedKeyword || undefined };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.books.list(queryFilters),
    queryFn: () => fetchSearch(queryFilters),
  });

  const books = data?.books ?? [];
  const totalCount = data?.totalCount ?? 0;

  const setFiltersMerge = useCallback((next: Partial<BookFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  return {
    books,
    isLoading,
    totalCount,
    filters,
    setFilters: setFiltersMerge,
  };
}
