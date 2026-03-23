'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart.store';
import { Button } from '@/components/ui/button';
import { trackAddToCart } from '@/lib/gtag';
import { cn } from '@/lib/utils';

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
  compact?: boolean;
  showCart?: boolean;
  rank?: number;
  priority?: boolean;
  hidePrice?: boolean;
  smallerCover80?: boolean;
  onBuyNow?: () => void;
  badge?: ReactNode;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/&lt;.*?&gt;/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const COVER_BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function parseTitle(title: string): { main: string; badge: string | null } {
  const cleaned = cleanTitle(title);
  const match = cleaned.match(/^(.+?)\s*[-:|]\s*(.+)$/);
  if (!match) return { main: cleaned, badge: null };
  const rest = match[2]!.trim();
  return { main: match[1]!.trim(), badge: rest.length <= 6 ? rest : null };
}

function BookCardInner({
  book,
  compact = false,
  showCart = true,
  rank,
  priority,
  hidePrice = false,
  smallerCover80 = false,
  onBuyNow,
  badge,
}: BookCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const titleFontSize = hidePrice && compact ? 'text-sm sm:text-lg' : compact ? 'text-xs' : 'text-sm';
  const { main: displayTitle, badge: titleBadge } = parseTitle(book.title);

  const contentClass = compact
    ? 'flex min-h-[108px] flex-1 flex-col p-2.5'
    : 'flex min-h-[124px] flex-1 flex-col p-3';
  const metaClass = compact
    ? 'flex min-h-[52px] flex-col'
    : 'flex min-h-[60px] flex-col';
  const priceClass = compact
    ? 'mt-1.5 flex min-h-[34px] flex-wrap items-start gap-2'
    : 'mt-1.5 flex min-h-[40px] flex-wrap items-start gap-2';
  const actionsClass = compact
    ? 'mt-auto flex min-h-[28px] gap-1 pt-2'
    : 'mt-auto flex min-h-[40px] gap-1 pt-3';

  return (
    <article className="group flex h-full w-full flex-col transition-all">
      <Link
        href={`/books/${book.slug}`}
        className={cn(
          'relative mx-auto mt-[5%] block aspect-[188/254] w-[90%] overflow-hidden rounded-sm bg-muted shadow-md transition-shadow',
          smallerCover80 && 'w-[72%]',
        )}
      >
        {book.coverImage ? (
          <Image
            src={book.coverImage}
            alt={book.title}
            fill
            sizes={compact ? '(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1200px) 20vw, 150px' : '(max-width: 768px) 50vw, 180px'}
            className="object-cover"
            priority={Boolean(priority)}
            loading={priority ? 'eager' : 'lazy'}
            placeholder="blur"
            blurDataURL={COVER_BLUR_DATA_URL}
            quality={compact ? 72 : 78}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}
        {rank != null && rank >= 1 && rank <= 10 ? (
          <span
            className="absolute left-0 top-0 flex h-6 min-w-6 items-center justify-center rounded-br bg-[#722f37] px-1 text-[10px] font-bold tabular-nums text-white shadow-[0_14px_30px_-18px_rgba(114,47,55,0.9)] ring-1 ring-white/15 sm:h-7 sm:min-w-7 sm:text-[11px] sm:px-1.5"
            aria-label={`베스트 ${rank}위`}
          >
            {rank}
          </span>
        ) : null}
        {badge}
      </Link>

      <div className={contentClass}>
        <Link
          href={`/books/${book.slug}`}
          className={`line-clamp-2 font-bold leading-snug tracking-tight text-foreground transition-colors hover:text-primary ${titleFontSize}`}
        >
          {displayTitle}
          {titleBadge ? (
            <span className="ml-1 inline-block rounded bg-muted px-1 py-0.5 align-middle text-xs font-semibold text-muted-foreground">
              {titleBadge}
            </span>
          ) : null}
        </Link>

        <div className={metaClass}>
          {!hidePrice ? (
            <>
              <p className={`mt-1 text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>{book.author}</p>
              <div className={priceClass}>
                <span className={`font-semibold text-primary ${compact ? 'text-xs' : ''}`}>{formatPrice(book.salePrice)}</span>
                {book.listPrice > book.salePrice ? (
                  <span className={`text-muted-foreground line-through ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {formatPrice(book.listPrice)}
                  </span>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {showCart ? (
          onBuyNow ? (
            <div className={actionsClass}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={compact ? 'h-7 flex-1 text-[11px]' : 'h-10 flex-1 text-xs'}
                onClick={() => {
                  addItem(book.isbn, 1);
                  trackAddToCart({
                    value: book.salePrice,
                    items: [{ item_id: book.isbn, item_name: book.title, price: book.salePrice, quantity: 1 }],
                  });
                }}
              >
                장바구니
              </Button>
              <Button
                type="button"
                size="sm"
                className={compact ? 'h-7 flex-1 text-[11px]' : 'h-10 flex-1 text-xs'}
                onClick={onBuyNow}
              >
                바로구매
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              className={compact ? 'mt-auto h-8 w-full text-xs' : 'mt-auto min-h-[48px] w-full'}
              onClick={() => {
                addItem(book.isbn, 1);
                trackAddToCart({
                  value: book.salePrice,
                  items: [{ item_id: book.isbn, item_name: book.title, price: book.salePrice, quantity: 1 }],
                });
              }}
            >
              장바구니
            </Button>
          )
        ) : null}
      </div>
    </article>
  );
}

const BookCard = memo(BookCardInner);
export default BookCard;
