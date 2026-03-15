import BookCarousel from '@/components/books/BookCarousel';
import type { BookCardBook } from '@/components/books/BookCard';

export interface ThemeCurationItem {
  id: string;
  title: string;
  books: BookCardBook[];
}

export interface ThemeCurationProps {
  items: ThemeCurationItem[];
}

export default function ThemeCuration({ items }: ThemeCurationProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-8">
      {items.map((item) => (
        <section key={item.id} className="space-y-3">
          <h2 className="text-lg font-semibold">{item.title}</h2>
          <BookCarousel books={item.books} />
        </section>
      ))}
    </div>
  );
}
