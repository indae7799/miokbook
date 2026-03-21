'use client';

import Link from 'next/link';
import BookCard from '@/components/books/BookCard';
import type { BookCardBook } from '@/components/books/BookCard';
import SectionHeading from '@/components/home/SectionHeading';
import { cn } from '@/lib/utils';

export interface ThemeCurationItem {
  id: string;
  title: string;
  description?: string;
  books: BookCardBook[];
}

export interface ThemeCurationProps {
  items: ThemeCurationItem[];
  title?: string;
}

export default function ThemeCuration({ items, title = '이번 달 씨앤에이논술 선정도서' }: ThemeCurationProps) {
  const allBooks = items.flatMap((item) => item.books);

  if (allBooks.length === 0) {
    return (
      <section className="space-y-6 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center">
        <h2 className="flex items-center justify-center gap-3 text-2xl font-bold leading-tight tracking-tight md:text-[32px]">
          <span className="home-section-title-bar h-[1.25em] w-1.5 shrink-0 md:w-2" aria-hidden />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          지금은 큐레이션 목록을 불러오지 못했습니다. 선정도서 페이지에서 둘러보실 수 있습니다.
        </p>
        <Link href="/selected-books" className="inline-block text-sm font-medium text-primary hover:underline">
          선정도서 보러 가기 →
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5 w-full min-w-0 flex flex-col items-center">
      <div className="w-full max-w-[1400px]">
        <SectionHeading
          title={title}
          subtitle="논술 강사진이 선정한 읽기 큐레이션"
          rightSlot={
            <Link href="/selected-books" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          }
        />
      </div>
      <div className="flex justify-center w-full max-w-[1400px] mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-[19px] w-full justify-items-center">
          {allBooks.slice(0, 12).map((book, i) => (
            <div key={book.isbn} className={cn('w-full flex justify-center', i >= 8 && 'max-md:hidden')}>
              <BookCard book={book} compact showCart={false} hidePrice />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
