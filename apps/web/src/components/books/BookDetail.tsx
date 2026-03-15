'use client';

import Image from 'next/image';
import { useCartStore } from '@/store/cart.store';
import { Button } from '@/components/ui/button';

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
}

export interface BookDetailProps {
  book: BookDetailBook;
  available: number;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export default function BookDetail({ book, available }: BookDetailProps) {
  const addItem = useCartStore((s) => s.addItem);
  const isOutOfStock = available <= 0;

  return (
    <article className="flex flex-col md:flex-row gap-6">
      <div className="relative aspect-[2/3] w-full max-w-sm shrink-0 rounded-lg overflow-hidden bg-muted">
        <Image
          src={book.coverImage}
          alt={book.title}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover"
          priority
        />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold">{book.title}</h1>
        <p className="text-muted-foreground mt-1">{book.author}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{book.publisher}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{book.category}</p>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xl font-semibold text-primary">{formatPrice(book.salePrice)}</span>
          {book.listPrice > book.salePrice && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(book.listPrice)}</span>
          )}
        </div>

        <div className="mt-3">
          <p className="text-sm font-medium">
            재고: {isOutOfStock ? <span className="text-destructive">품절</span> : <span>{available}권</span>}
          </p>
        </div>

        <Button
          type="button"
          className="mt-4 min-h-[48px] min-w-[48px]"
          disabled={isOutOfStock}
          onClick={() => addItem(book.isbn, 1)}
        >
          {isOutOfStock ? '품절' : '장바구니 담기'}
        </Button>

        {book.description && (
          <div className="mt-6 pt-6 border-t border-border">
            <h2 className="text-sm font-semibold mb-2">책 소개</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{book.description}</p>
          </div>
        )}
      </div>
    </article>
  );
}
