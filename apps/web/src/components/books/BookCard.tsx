'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart.store';
import { Button } from '@/components/ui/button';
import { trackAddToCart } from '@/lib/gtag';
import { cmsImageUnoptimized } from '@/lib/cms-image';

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
  /** 교보 스타일: 그리드 5열, 표지 비율 2:3 유지 */
  compact?: boolean;
  /** 랜딩(교보 스타일)에서는 false — 장바구니 버튼 숨김 */
  showCart?: boolean;
  /** 베스트셀러 순위 (1~10 등, 교보문고 스타일 뱃지) */
  rank?: number;
  /** LCP 개선: above-the-fold 첫 이미지에 사용 */
  priority?: boolean;
  /** 가격 숨기기 (랜딩페이지용) */
  hidePrice?: boolean;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/&lt;.*?&gt;/g, '') // &lt;상&gt; 형태 제거
    .replace(/<[^>]*>/g, '')     // <상> 형태 제거
    .replace(/&[a-zA-Z]+;/g, '') // 기타 HTML 엔티티 제거
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTitle(title: string): { main: string; badge: string | null } {
  const cleaned = cleanTitle(title);
  const match = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (!match) return { main: cleaned, badge: null };
  const rest = match[2]!.trim();
  return { main: match[1]!.trim(), badge: rest.length <= 6 ? rest : null };
}

function BookCardInner({ book, compact = false, showCart = true, rank, priority, hidePrice = false }: BookCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  // 가격이 숨겨진 경우(랜딩용) 폰트 크기를 키움
  const titleFontSize = hidePrice && compact ? 'text-sm sm:text-lg' : compact ? 'text-xs' : 'text-sm';

  const { main: displayTitle, badge } = parseTitle(book.title);

  return (
    <article className="w-full flex flex-col transition-all group">
      <Link
        href={`/books/${book.slug}`}
        className="block relative w-[90%] md:w-[72%] mx-auto mt-[5%] aspect-[188/254] rounded-sm shadow-md overflow-hidden bg-muted transition-shadow"
      >
        {book.coverImage ? (
          <Image
            src={book.coverImage}
            alt={book.title}
            fill
            sizes={
              compact
                ? '(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1200px) 20vw, 120px'
                : '(max-width: 768px) 50vw, 144px'
            }
            className="object-cover"
            priority={!!priority}
            loading={priority ? 'eager' : 'lazy'}
            unoptimized={cmsImageUnoptimized(book.coverImage)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            No Image
          </div>
        )}
        {rank != null && rank >= 1 && rank <= 10 && (
          <span
            className="absolute left-0 top-0 flex h-6 min-w-6 items-center justify-center rounded-br bg-primary text-[10px] font-bold text-primary-foreground"
            aria-label={`${rank}위`}
          >
            {rank}
          </span>
        )}
      </Link>
      <div className={compact ? 'p-2.5 flex-1 flex flex-col min-h-[85px]' : 'p-3 flex-1 flex flex-col min-h-[100px]'}>
        <Link
          href={`/books/${book.slug}`}
          className={`line-clamp-2 font-bold hover:text-primary transition-colors ${titleFontSize} leading-snug tracking-tight text-foreground`}
        >
          {displayTitle}
          {badge && (
            <span className="ml-1 inline-block align-middle rounded bg-muted px-1 py-0.5 text-xs font-semibold text-muted-foreground">
              {badge}
            </span>
          )}
        </Link>
        
        {!hidePrice && (
          <>
            <p className={`text-muted-foreground mt-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>{book.author}</p>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-primary ${compact ? 'text-xs' : ''}`}>{formatPrice(book.salePrice)}</span>
              {book.listPrice > book.salePrice && (
                <span className={`text-muted-foreground line-through ${compact ? 'text-[10px]' : 'text-xs'}`}>{formatPrice(book.listPrice)}</span>
              )}
            </div>
          </>
        )}

        {showCart && (
          <Button
            type="button"
            variant="default"
            size="sm"
            className={compact ? 'mt-2 h-8 w-full text-xs' : 'mt-3 min-h-[48px] w-full'}
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
        )}
      </div>
    </article>
  );
}

const BookCard = memo(BookCardInner);
export default BookCard;
