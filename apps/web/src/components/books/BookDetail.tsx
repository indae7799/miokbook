'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BookReviewSection from '@/components/books/BookReviewSection';
import BookCard from '@/components/books/BookCard';

export interface BookDetailBook {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  publisher: string;
  description: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
  category: string;
  status: string;
  publishDate?: Date | string;
  rating?: number;
  reviewCount?: number;
  tableOfContents?: string;
}

export interface BookDetailProps {
  book: BookDetailBook;
  available: number;
  recommendedBooks?: BookDetailBook[];
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

/** PRD 9: 평점 0~5 → 별 표시 */
function StarRating({ rating = 0 }: { rating?: number }) {
  const r = Math.min(5, Math.max(0, rating));
  const full = Math.floor(r);
  const half = r - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`평점 ${r}점`}>
      {Array.from({ length: full }, (_, i) => (
        <span key={`f-${i}`} className="text-amber-500">★</span>
      ))}
      {half ? <span className="text-amber-500">½</span> : null}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e-${i}`} className="text-muted-foreground">☆</span>
      ))}
      <span className="text-sm text-muted-foreground ml-1">{r.toFixed(1)}</span>
    </span>
  );
}

export default function BookDetail({ book, available, recommendedBooks = [] }: BookDetailProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const isOutOfStock = available <= 0;

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addItem(book.isbn, 1);
    router.push('/checkout');
  };

  return (
    <article className="space-y-8">
      {/* PRD 9 상단: 좌 표지, 우 제목/저자/출판사/가격/평점/리뷰수, 버튼, 재고(품절 배지) */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative aspect-[2/3] w-full max-w-sm shrink-0 rounded-lg overflow-hidden bg-muted">
          <Image
            src={book.coverImage}
            alt={book.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
            priority
          />
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Badge variant="destructive" className="text-base px-3 py-1">품절</Badge>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold">{book.title}</h1>
          <p className="text-muted-foreground mt-1">{book.author}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{book.publisher}</p>
          {book.category && (
            <p className="text-sm text-muted-foreground mt-0.5">{book.category}</p>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-xl font-semibold text-primary">{formatPrice(book.salePrice)}</span>
            {book.listPrice > book.salePrice && (
              <span className="text-sm text-muted-foreground line-through">{formatPrice(book.listPrice)}</span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <StarRating rating={book.rating} />
            {(book.reviewCount ?? 0) > 0 && (
              <span className="text-sm text-muted-foreground">리뷰 {book.reviewCount}개</span>
            )}
          </div>

          <div className="mt-3">
            {isOutOfStock ? (
              <Badge variant="secondary">품절</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">재고 {available}권</span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-[48px]"
              disabled={isOutOfStock}
              onClick={() => addItem(book.isbn, 1)}
            >
              {isOutOfStock ? '품절' : '장바구니 담기'}
            </Button>
            <Button
              type="button"
              variant="default"
              className="min-h-[48px]"
              disabled={isOutOfStock}
              onClick={handleBuyNow}
            >
              바로 구매
            </Button>
          </div>
        </div>
      </div>

      {/* PRD 9: 책 소개 */}
      {book.description && (
        <section className="border-t border-border pt-6">
          <h2 className="text-lg font-semibold mb-2">책 소개</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{book.description}</p>
        </section>
      )}

      {/* PRD 9: 저자 소개 (author, publisher 기반) */}
      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold mb-2">저자 소개</h2>
        <p className="text-muted-foreground">
          {book.author}
          {book.publisher && ` · ${book.publisher}`}
        </p>
      </section>

      {/* PRD 9: 목차 (선택 필드) */}
      {book.tableOfContents && book.tableOfContents.trim() && (
        <section className="border-t border-border pt-6">
          <h2 className="text-lg font-semibold mb-2">목차</h2>
          <div className="text-muted-foreground whitespace-pre-wrap text-sm">{book.tableOfContents}</div>
        </section>
      )}

      {/* PRD 9: 리뷰 섹션 */}
      <section className="border-t border-border pt-6">
        <BookReviewSection isbn={book.isbn} />
      </section>

      {/* PRD 9: 추천 도서 (같은 카테고리) */}
      {recommendedBooks.length > 0 && (
        <section className="border-t border-border pt-6">
          <h2 className="text-lg font-semibold mb-4">추천 도서</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recommendedBooks.map((b) => (
              <BookCard
                key={b.isbn}
                book={{
                  isbn: b.isbn,
                  slug: b.slug,
                  title: b.title,
                  author: b.author,
                  coverImage: b.coverImage,
                  listPrice: b.listPrice,
                  salePrice: b.salePrice,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
