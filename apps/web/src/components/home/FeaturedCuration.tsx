import BookCarousel from '@/components/books/BookCarousel';
import type { BookCardBook } from '@/components/books/BookCard';

export interface FeaturedCurationProps {
  books: BookCardBook[];
  recommendationText?: string;
  title?: string;
}

export default function FeaturedCuration({
  books,
  recommendationText,
  title = '독립서점 추천',
}: FeaturedCurationProps) {
  if (books.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {recommendationText && (
          <p className="text-sm text-muted-foreground mt-1">{recommendationText}</p>
        )}
      </div>
      <BookCarousel books={books} />
    </section>
  );
}
