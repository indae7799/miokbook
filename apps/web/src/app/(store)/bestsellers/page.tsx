import Link from 'next/link';
import BookCard from '@/components/books/BookCard';
import { getBestsellersForListing } from '@/lib/store/book-list-pages';

/** ISR 상한(초). on-demand 무효화가 없을 때만 이 주기로 갱신 */
export const revalidate = 120;

export const metadata = {
  title: '베스트셀러',
  description: '지금 가장 많이 읽히는 도서를 만나 보세요.',
};

export default async function BestsellersPage() {
  const books = await getBestsellersForListing();

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/#section-bestsellers" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← 홈
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">베스트셀러</h1>
      <p className="mt-1 text-sm text-muted-foreground">홈과 동일 기준(판매량 순)으로 정렬된 도서입니다.</p>

      {books.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">표시할 도서가 없습니다.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 justify-items-center gap-[19px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {books.map((book, i) => (
            <BookCard
              key={book.isbn}
              book={book}
              compact
              showCart={false}
              rank={i < 10 ? i + 1 : undefined}
              priority={i < 6}
              hidePrice
            />
          ))}
        </div>
      )}
    </main>
  );
}
