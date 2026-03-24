'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AutocompleteSuggestion {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  publisher: string;
  coverImage: string;
  salePrice: number;
  listPrice: number;
  category?: string | null;
}

const clientCache = new Map<string, { data: AutocompleteSuggestion[]; ts: number }>();
const CLIENT_CACHE_TTL = 30_000;
const DEBOUNCE_MS = 150;

async function fetchSuggestions(keyword: string): Promise<AutocompleteSuggestion[]> {
  const key = keyword.toLowerCase().trim();
  if (!key) return [];
  const cached = clientCache.get(key);
  if (cached && Date.now() - cached.ts < CLIENT_CACHE_TTL) return cached.data;

  const res = await fetch(`/api/search?autocomplete=true&keyword=${encodeURIComponent(key)}`);
  if (!res.ok) return [];
  const json = await res.json();
  const list: AutocompleteSuggestion[] = json?.data?.suggestions ?? [];
  clientCache.set(key, { data: list, ts: Date.now() });
  return list;
}

export interface UseSearchAutocompleteReturn {
  suggestions: AutocompleteSuggestion[];
  loading: boolean;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useSearchAutocomplete(
  keyword: string,
  opts: {
    enabled?: boolean;
    onSelect?: (s: AutocompleteSuggestion) => void;
    onSubmit?: (keyword: string) => void;
    onClose?: () => void;
  } = {},
): UseSearchAutocompleteReturn {
  const { enabled = true, onSelect, onSubmit, onClose } = opts;
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setActiveIndex(-1);
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = keyword.trim();
    if (!trimmed || !enabled) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const result = await fetchSuggestions(trimmed);
        setSuggestions(result);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [keyword, enabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.nativeEvent as KeyboardEvent).isComposing) return;
      const total = suggestions.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < total) {
        e.preventDefault();
        onSelect?.(suggestions[activeIndex]);
      } else if (e.key === 'Escape') {
        onClose?.();
      }
    },
    [suggestions, activeIndex, keyword, onSelect, onSubmit, onClose],
  );

  return { suggestions, loading, activeIndex, setActiveIndex, handleKeyDown };
}
