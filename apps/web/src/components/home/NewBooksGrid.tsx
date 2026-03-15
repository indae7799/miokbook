import BookCard from '@/components/books/BookCard';
import type { BookCardBook } from '@/components/books/BookCard';

export interface NewBooksGridProps {
  books: BookCardBook[];
}

export default function NewBooksGrid({ books }: NewBooksGridProps) {
  if (books.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">신간 도서</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {books.map((book) => (
          <BookCard key={book.isbn} book={book} />
        ))}
      </div>
    </section>
  );
}
