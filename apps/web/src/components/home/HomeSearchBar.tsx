'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * 메인(홈) 상단 전용 검색창. 햄버거 메뉴 안에는 넣지 않음.
 */
export default function HomeSearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value?.trim();
    if (q) {
      router.push(`/books?keyword=${encodeURIComponent(q)}`);
    } else {
      router.push('/books');
    }
  }

  return (
    <section className="w-full px-4 py-4">
      <p className="text-center text-muted-foreground text-sm mb-2">지금 어떤 책을 찾고 있나요?</p>
      <form onSubmit={handleSubmit} className="flex max-w-xl mx-auto gap-2">
        <Input
          ref={inputRef}
          type="search"
          name="q"
          placeholder="책 제목 / 작가 검색"
          className="flex-1 min-h-12 rounded-full border-border bg-background"
          aria-label="책 제목 또는 작가 검색"
        />
        <Button type="submit" size="icon" className="shrink-0 rounded-full min-h-12 min-w-12" aria-label="검색">
          <Search className="size-5" />
        </Button>
      </form>
    </section>
  );
}
