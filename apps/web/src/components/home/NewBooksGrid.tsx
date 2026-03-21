'use client';

import Link from 'next/link';
import BookCard from '@/components/books/BookCard';
import type { BookCardBook } from '@/components/books/BookCard';
import HomeSectionFallback from '@/components/home/HomeSectionFallback';
import SectionHeading from '@/components/home/SectionHeading';

export interface NewBooksGridProps {
  books: BookCardBook[];
  title?: string;
}

/** 1400px 기준 가로 6권, 동일 간격·동일 표지 크기 (교보 스타일) */
export default function NewBooksGrid({ books, title = '금주 출간된 새 책들' }: NewBooksGridProps) {
  if (books.length === 0) {
    return (
      <HomeSectionFallback
        title={title}
        primaryHref="/new-books"
        primaryLabel="신간 전체 보기"
        secondaryHref="/books"
        secondaryLabel="전체 도서 →"
      />
    );
  }
  return (
    <section className="space-y-5 w-full min-w-0">
      <SectionHeading
        title={title}
        subtitle="이번 주 새롭게 입고된 도서를 확인해 보세요"
        rightSlot={
          <Link href="/new-books" className="text-sm text-primary hover:underline">
            전체 보기
          </Link>
        }
      />
      <div className="flex justify-center w-full max-w-[1400px] mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-[19px] w-full justify-items-center">
          {books.map((book) => (
            <BookCard key={book.isbn} book={book} compact showCart={false} hidePrice smallerCover80 />
          ))}
        </div>
      </div>
    </section>
  );
}
