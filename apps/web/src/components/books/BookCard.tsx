'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart.store';
import { Button } from '@/components/ui/button';

export interface BookCardBook {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
}

export interface BookCardProps {
  book: BookCardBook;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export default function BookCard({ book }: BookCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <article className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <Link href={`/books/${book.slug}`} className="block relative aspect-[2/3] w-full bg-muted">
        <Image
          src={book.coverImage}
          alt={book.title}
          fill
          sizes="(max-width: 768px) 50vw, 200px"
          className="object-cover"
        />
      </Link>
      <div className="p-3 flex-1 flex flex-col">
        <Link href={`/books/${book.slug}`} className="line-clamp-2 font-medium text-sm hover:underline">
          {book.title}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-primary">{formatPrice(book.salePrice)}</span>
          {book.listPrice > book.salePrice && (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(book.listPrice)}</span>
          )}
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="mt-3 min-h-[48px] w-full"
          onClick={() => addItem(book.isbn, 1)}
        >
          장바구니 담기
        </Button>
      </div>
    </article>
  );
}
