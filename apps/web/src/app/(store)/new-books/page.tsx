import Link from 'next/link';
import BookCard from '@/components/books/BookCard';
import { getNewBooksForListing } from '@/lib/store/book-list-pages';

export const revalidate = 120;

export const metadata = {
  title: '신간 도서',
  description: '미옥서원에 새로 들어온 신간 도서를 최신순으로 확인해 보세요.',
  alternates: { canonical: '/new-books' },
};

export default async function NewBooksPage() {
  const books = await getNewBooksForListing();

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          홈
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">이번 주 새로 들어온 책</h1>
      <p className="mt-1 text-sm text-muted-foreground">신규 등록 순서대로 최신 도서를 보여드립니다.</p>

      {books.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">표시할 신간 도서가 없습니다.</p>
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
