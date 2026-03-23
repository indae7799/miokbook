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
  /** 표지 너비를 기본(셀 대비 90%)의 80%로 — MD 추천 우측·북콘서트·상세 관련도서 등에는 넣지 않음 */
  smallerCover80?: boolean;
  /** 바로구매 핸들러 — 설정 시 장바구니 옆에 바로구매 버튼 추가 */
  onBuyNow?: () => void;
  /** 표지 위에 올라갈 뱃지 (학년 등) */
  badge?: ReactNode;
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

/** 1×1 회색 PNG — 표지 로드 전 블러 자리표시로 튐 완화 */
const COVER_BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function parseTitle(title: string): { main: string; badge: string | null } {
  const cleaned = cleanTitle(title);
  const match = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
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
  const addItem = useCartStore((s) => s.addItem);

  // 가격이 숨겨진 경우(랜딩용) 폰트 크기를 키움
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
          'block relative mx-auto mt-[5%] aspect-[188/254] rounded-sm shadow-md overflow-hidden bg-muted transition-shadow w-[90%]',
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
            priority={!!priority}
            loading={priority ? 'eager' : 'lazy'}
            placeholder="blur"
            blurDataURL={COVER_BLUR_DATA_URL}
            quality={compact ? 72 : 78}
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
        {badge}
      </Link>
      <div className={contentClass}>
        <Link
          href={`/books/${book.slug}`}
          className={`line-clamp-2 font-bold hover:text-primary transition-colors ${titleFontSize} leading-snug tracking-tight text-foreground`}
        >
          {displayTitle}
          {titleBadge && (
            <span className="ml-1 inline-block align-middle rounded bg-muted px-1 py-0.5 text-xs font-semibold text-muted-foreground">
              {titleBadge}
            </span>
          )}
        </Link>
        
        <div className={metaClass}>
          {!hidePrice && (
            <>
              <p className={`mt-1 text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>{book.author}</p>
              <div className={priceClass}>
                <span className={`font-semibold text-primary ${compact ? 'text-xs' : ''}`}>{formatPrice(book.salePrice)}</span>
                {book.listPrice > book.salePrice && (
                  <span className={`text-muted-foreground line-through ${compact ? 'text-[10px]' : 'text-xs'}`}>{formatPrice(book.listPrice)}</span>
                )}
              </div>
            </>
          )}
        </div>

        {showCart && (
          onBuyNow ? (
            <div className={actionsClass}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={compact ? 'flex-1 h-7 text-[11px]' : 'flex-1 h-10 text-xs'}
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
                className={compact ? 'flex-1 h-7 text-[11px]' : 'flex-1 h-10 text-xs'}
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
        )}
      </div>
    </article>
  );
}

const BookCard = memo(BookCardInner);
export default BookCard;
