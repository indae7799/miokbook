import Link from 'next/link';
import Image from 'next/image';
import type { BookCardBook } from '@/components/books/BookCard';

export interface BestsellerSectionProps {
  books: BookCardBook[];
  title?: string;
}

export default function BestsellerSection({ books, title = '베스트셀러' }: BestsellerSectionProps) {
  if (books.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ol className="space-y-2">
        {books.slice(0, 10).map((book, i) => (
          <li key={book.isbn}>
            <Link
              href={`/books/${book.slug}`}
              className="flex items-center gap-3 min-h-[48px] rounded-lg border border-border bg-card p-2 hover:bg-accent"
            >
              <span className="flex-shrink-0 w-6 text-center font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <div className="relative aspect-[2/3] w-10 shrink-0 rounded overflow-hidden bg-muted">
                <Image src={book.coverImage} alt={book.title} fill sizes="40px" className="object-cover" />
              </div>
              <span className="line-clamp-2 text-sm font-medium flex-1 min-w-0">{book.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
