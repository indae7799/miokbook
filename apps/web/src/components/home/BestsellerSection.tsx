import Link from 'next/link';
import BookCard from '@/components/books/BookCard';
import type { BookCardBook } from '@/components/books/BookCard';
import HomeSectionFallback from '@/components/home/HomeSectionFallback';
import SectionHeading from '@/components/home/SectionHeading';

export interface BestsellerSectionProps {
  books: BookCardBook[];
  title?: string;
}

/** 1400px 기준 가로 6권, 동일 간격·동일 표지 크기 (교보 스타일) */
export default function BestsellerSection({ books, title = '오늘의 베스트셀러' }: BestsellerSectionProps) {
  if (books.length === 0) {
    return (
      <section id="section-bestsellers" className="scroll-mt-24">
        <HomeSectionFallback
          title={title}
          primaryHref="/bestsellers"
          primaryLabel="베스트셀러 전체 보기"
          secondaryHref="/new-books"
          secondaryLabel="신간 도서 보기 →"
        />
      </section>
    );
  }
  return (
    <section id="section-bestsellers" className="scroll-mt-24 space-y-5 w-full min-w-0 flex flex-col items-center">
      <div className="w-full max-w-[1400px]">
        <SectionHeading
          title={title}
          subtitle="지금 가장 많이 읽히는 도서"
          rightSlot={
            <Link href="/bestsellers" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          }
        />
      </div>
      <div className="flex justify-center w-full max-w-[1400px] mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-[19px] w-full justify-items-center">
          {books.slice(0, 12).map((book, i) => (
            <div key={book.isbn} className={`w-full ${i >= 8 ? 'hidden sm:block' : ''}`}>
              <BookCard
                book={book}
                compact
                showCart={false}
                rank={i < 10 ? i + 1 : undefined}
                priority={i === 0}
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
