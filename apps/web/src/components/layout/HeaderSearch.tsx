'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, Clock, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchHistoryStore } from '@/store/searchHistory.store';
import { useSearchAutocomplete, type AutocompleteSuggestion } from '@/hooks/useSearchAutocomplete';

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export default function HeaderSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);

  const { recentKeywords, addKeyword, removeKeyword, clearHistory } = useSearchHistoryStore();

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
      setOpen(false);
    },
    [addKeyword, router],
  );

  const handleSelect = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      addKeyword(suggestion.title);
      router.push(`/books?keyword=${encodeURIComponent(suggestion.title)}`);
      setValue('');
      setOpen(false);
    },
    [addKeyword, router],
  );

  const { suggestions, loading, activeIndex, setActiveIndex, handleKeyDown } = useSearchAutocomplete(value, {
    enabled: open,
    onSelect: handleSelect,
    onSubmit: goToSearch,
    onClose: () => setOpen(false),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submitted = String(formData.get('keyword') ?? inputRef.current?.value ?? value);
    goToSearch(submitted);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmed = value.trim();
  const hasRecent = recentKeywords.length > 0;
  const showRecent = open && !trimmed && hasRecent;
  const showSuggestions = open && trimmed.length > 0;

  return (
    <div className="relative min-w-0 max-w-lg flex-1" ref={containerRef}>
      <form onSubmit={handleSubmit} className="flex gap-1">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            name="keyword"
            placeholder="책 제목, 저자, ISBN 검색"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="h-10 min-h-[40px] pl-8 pr-8"
            aria-label="도서 검색"
            autoComplete="off"
          />
          {value ? (
            <button
              type="button"
              className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              aria-label="검색어 지우기"
              onClick={() => {
                setValue('');
                setOpen(true);
              }}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <Button type="submit" size="icon" className="min-h-[40px] min-w-[40px] shrink-0" aria-label="검색">
          <Search className="size-5" />
        </Button>
      </form>

      {showRecent || showSuggestions ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 min-w-0 overflow-hidden rounded-xl border border-border bg-popover shadow-xl sm:min-w-[360px]">
          {showRecent ? (
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">최근 검색어</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    clearHistory();
                    setOpen(false);
                  }}
                >
                  전체 삭제
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentKeywords.map((keyword) => (
                  <div
                    key={keyword}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                    role="button"
                    tabIndex={0}
                    onClick={() => goToSearch(keyword)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        goToSearch(keyword);
                      }
                    }}
                  >
                    <Clock className="size-3 text-muted-foreground" />
                    <span className="max-w-[120px] truncate">{keyword}</span>
                    <button
                      type="button"
                      className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10"
                      aria-label={`${keyword} 삭제`}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeKeyword(keyword);
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showSuggestions ? (
            <div>
              {loading && suggestions.length === 0 ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="flex animate-pulse gap-3">
                      <div className="h-[60px] w-10 shrink-0 rounded bg-muted" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 w-3/4 rounded bg-muted" />
                        <div className="h-3 w-1/2 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <ul className="py-1" role="listbox">
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={suggestion.isbn}
                        role="option"
                        aria-selected={index === activeIndex}
                        className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                          index === activeIndex ? 'bg-accent' : 'hover:bg-muted/50'
                        }`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSelect(suggestion)}
                      >
                        <div className="relative h-[60px] w-10 shrink-0 overflow-hidden rounded bg-muted">
                          {suggestion.coverImage ? (
                            <Image src={suggestion.coverImage} alt="" fill sizes="40px" className="object-cover" unoptimized={suggestion.coverImage.includes('aladin.co.kr')} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[8px] text-muted-foreground">N/A</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight">{suggestion.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {suggestion.author}
                            {suggestion.publisher ? ` · ${suggestion.publisher}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {suggestion.salePrice > 0 ? (
                            <p className="text-sm font-bold text-primary">{formatPrice(suggestion.salePrice)}</p>
                          ) : null}
                          {suggestion.listPrice > suggestion.salePrice && suggestion.listPrice > 0 ? (
                            <p className="text-xs text-muted-foreground line-through">{formatPrice(suggestion.listPrice)}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/books?keyword=${encodeURIComponent(trimmed)}`}
                    className="flex items-center justify-center gap-1 border-t border-border px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-accent"
                    onClick={() => {
                      addKeyword(trimmed);
                      setOpen(false);
                      setValue('');
                    }}
                  >
                    &apos;{trimmed}&apos; 전체 검색 결과 보기
                    <ChevronRight className="size-4" />
                  </Link>
                </>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">&apos;{trimmed}&apos;에 대한 검색 결과가 없습니다.</p>
                  <Link
                    href={`/books?keyword=${encodeURIComponent(trimmed)}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    onClick={() => {
                      addKeyword(trimmed);
                      setOpen(false);
                      setValue('');
                    }}
                  >
                    전체 검색으로 보기
                    <ChevronRight className="size-3" />
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
