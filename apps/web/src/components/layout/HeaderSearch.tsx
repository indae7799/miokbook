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
    (s: AutocompleteSuggestion) => {
      addKeyword(s.title);
      router.push(`/books/${s.slug}`);
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const submitted = String(formData.get('keyword') ?? inputRef.current?.value ?? value);
    goToSearch(submitted);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    <div className="relative flex-1 min-w-0 max-w-lg" ref={containerRef}>
      <form onSubmit={handleSubmit} className="flex gap-1">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="search"
            name="keyword"
            placeholder="책 제목, 저자, ISBN 검색"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-8 min-h-[40px] h-10 pr-8"
            aria-label="도서 검색"
            autoComplete="off"
          />
          {value && (
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              aria-label="지우기"
              onClick={() => { setValue(''); setOpen(true); }}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button type="submit" size="icon" className="shrink-0 min-h-[40px] min-w-[40px]" aria-label="검색">
          <Search className="size-5" />
        </Button>
      </form>

      {(showRecent || showSuggestions) && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-popover shadow-xl overflow-hidden min-w-[360px]">

          {showRecent && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">최근 검색어</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { clearHistory(); setOpen(false); }}
                >
                  전체 삭제
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentKeywords.map((k) => (
                  <div
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                    role="button"
                    tabIndex={0}
                    onClick={() => goToSearch(k)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goToSearch(k);
                      }
                    }}
                  >
                    <Clock className="size-3 text-muted-foreground" />
                    <span className="max-w-[120px] truncate">{k}</span>
                    <button
                      type="button"
                      className="ml-0.5 rounded-full hover:bg-destructive/10 p-0.5"
                      aria-label={`${k} 삭제`}
                      onClick={(e) => { e.stopPropagation(); removeKeyword(k); }}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSuggestions && (
            <div>
              {loading && suggestions.length === 0 ? (
                <div className="p-4 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-10 h-[60px] bg-muted rounded shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <ul className="py-1" role="listbox">
                    {suggestions.map((s, i) => (
                      <li
                        key={s.isbn}
                        role="option"
                        aria-selected={i === activeIndex}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          i === activeIndex ? 'bg-accent' : 'hover:bg-muted/50'
                        }`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => handleSelect(s)}
                      >
                        <div className="w-10 h-[60px] shrink-0 rounded overflow-hidden bg-muted relative">
                          {s.coverImage ? (
                            <Image src={s.coverImage} alt="" fill sizes="40px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">N/A</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-tight truncate">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {s.author}{s.publisher ? ` · ${s.publisher}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {s.salePrice > 0 && (
                            <p className="text-sm font-bold text-primary">{formatPrice(s.salePrice)}</p>
                          )}
                          {s.listPrice > s.salePrice && s.listPrice > 0 && (
                            <p className="text-xs text-muted-foreground line-through">{formatPrice(s.listPrice)}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/books?keyword=${encodeURIComponent(trimmed)}`}
                    className="flex items-center justify-center gap-1 px-4 py-3 border-t border-border text-sm font-medium text-primary hover:bg-accent transition-colors"
                    onClick={() => { addKeyword(trimmed); setOpen(false); setValue(''); }}
                  >
                    &apos;{trimmed}&apos; 전체 검색 결과 보기
                    <ChevronRight className="size-4" />
                  </Link>
                </>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    &apos;{trimmed}&apos;에 대한 검색 결과가 없습니다
                  </p>
                  <Link
                    href={`/books?keyword=${encodeURIComponent(trimmed)}`}
                    className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                    onClick={() => { addKeyword(trimmed); setOpen(false); setValue(''); }}
                  >
                    전체 검색으로 보기
                    <ChevronRight className="size-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
