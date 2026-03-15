'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchHistoryStore } from '@/store/searchHistory.store';

const AUTOCOMPLETE_DEBOUNCE_MS = 200;

interface Suggestion {
  isbn: string;
  slug: string;
  title: string;
  author: string;
}

export default function HeaderSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { recentKeywords, addKeyword, removeKeyword, clearHistory } = useSearchHistoryStore();

  const fetchAutocomplete = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?autocomplete=true&keyword=${encodeURIComponent(keyword)}`
      );
      const json = await res.json();
      const list = json?.data?.suggestions ?? [];
      setSuggestions(Array.isArray(list) ? list : []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchAutocomplete(value);
      debounceRef.current = null;
    }, AUTOCOMPLETE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchAutocomplete]);

  const goToSearch = useCallback(
    (keyword: string) => {
      const q = keyword.trim();
      if (q) {
        addKeyword(q);
        router.push(`/books?keyword=${encodeURIComponent(q)}`);
      } else {
        router.push('/books');
      }
      setValue('');
      setShowDropdown(false);
      setSuggestions([]);
    },
    [addKeyword, router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToSearch(value);
  };

  const handleSelectSuggestion = (s: Suggestion) => {
    addKeyword(s.title);
    router.push(`/books/${s.slug}`);
    setValue('');
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleSelectRecent = (k: string) => {
    goToSearch(k);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (inputRef.current && !inputRef.current.contains(target)) {
        const dropdown = document.getElementById('header-search-dropdown');
        if (dropdown && !dropdown.contains(target)) {
          setShowDropdown(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasRecent = recentKeywords.length > 0;
  const hasSuggestions = suggestions.length > 0;
  const showRecent = showDropdown && !value.trim() && hasRecent;
  const showSuggestions = showDropdown && value.trim() && (hasSuggestions || loading);

  return (
    <div className="relative flex-1 min-w-0 max-w-md" ref={inputRef}>
      <form onSubmit={handleSubmit} className="flex gap-1">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="책 제목 / 작가 검색"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            className="pl-8 min-h-[40px] h-10 pr-8"
            aria-label="책 제목 또는 작가 검색"
            autoComplete="off"
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
              aria-label="지우기"
              onClick={() => setValue('')}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        <Button type="submit" size="icon" className="shrink-0 min-h-[40px] min-w-[40px]" aria-label="검색">
          <Search className="size-5" />
        </Button>
      </form>

      {(showRecent || showSuggestions) && (
        <div
          id="header-search-dropdown"
          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg max-h-64 overflow-y-auto"
        >
          {showRecent && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-medium text-muted-foreground">최근 검색어</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    clearHistory();
                    setShowDropdown(false);
                  }}
                >
                  전체 삭제
                </Button>
              </div>
              <ul className="space-y-0.5">
                {recentKeywords.map((k) => (
                  <li key={k} className="flex items-center gap-1 group">
                    <button
                      type="button"
                      className="flex-1 text-left px-3 py-2 rounded-md hover:bg-accent text-sm truncate"
                      onClick={() => handleSelectRecent(k)}
                    >
                      {k}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 group-hover:opacity-100"
                      aria-label={`${k} 삭제`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeKeyword(k);
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showSuggestions && (
            <div className="p-2">
              {loading ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">검색 중...</div>
              ) : hasSuggestions ? (
                <ul className="space-y-0.5">
                  {suggestions.map((s) => (
                    <li key={s.isbn}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent text-sm"
                        onClick={() => handleSelectSuggestion(s)}
                      >
                        <span className="font-medium truncate block">{s.title}</span>
                        <span className="text-xs text-muted-foreground">{s.author}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  검색어를 입력하세요
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
