import Link from 'next/link';
import BookCard from '@/components/books/BookCard';
import { getNewBooksForListing } from '@/lib/store/book-list-pages';

export const revalidate = 120;

export const metadata = {
  title: '신간 도서',
  description: '새롭게 입고된 도서를 최신순으로 확인하세요.',
};

export default async function NewBooksPage() {
  const books = await getNewBooksForListing();

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← 홈
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">금주 출간된 새 책</h1>
      <p className="mt-1 text-sm text-muted-foreground">홈 신간 영역과 동일하게, 최근 등록순으로 보여 드립니다.</p>

      {books.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">표시할 도서가 없습니다.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 justify-items-center gap-[19px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {books.map((book, i) => (
            <BookCard key={book.isbn} book={book} compact showCart={false} priority={i < 6} hidePrice smallerCover80 />
          ))}
        </div>
      )}
    </main>
  );
}
