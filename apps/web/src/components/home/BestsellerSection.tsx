import Link from 'next/link';
import BookCard from '@/components/books/BookCard';
import type { BookCardBook } from '@/components/books/BookCard';
import HomeSectionFallback from '@/components/home/HomeSectionFallback';
import SectionHeading from '@/components/home/SectionHeading';

export interface BestsellerSectionProps {
  books: BookCardBook[];
  title?: string;
}

export default function BestsellerSection({ books, title = '오늘의 베스트셀러' }: BestsellerSectionProps) {
  if (books.length === 0) {
    return (
      <section id="section-bestsellers" className="scroll-mt-24">
        <HomeSectionFallback
          title={title}
          primaryHref="/bestsellers"
          primaryLabel="베스트셀러 전체 보기"
          secondaryHref="/new-books"
          secondaryLabel="신간 도서 보기"
        />
      </section>
    );
  }

  return (
    <section id="section-bestsellers" className="scroll-mt-24 flex w-full min-w-0 flex-col items-center space-y-5">
      <div className="w-full max-w-[1400px]">
        <SectionHeading
          title={title}
          rightSlot={
            <Link href="/bestsellers" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          }
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] justify-center">
        <div className="grid w-full grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 sm:gap-[19px] md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {books.slice(0, 12).map((book, index) => (
            <div key={book.isbn} className={`w-full ${index >= 8 ? 'hidden sm:block' : ''}`}>
              <BookCard
                book={book}
                compact
                showCart={false}
                priority={index === 0}
                hidePrice
                smallerCover80
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
