'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export default function CartPage() {
  const router = useRouter();
  const {
    enrichedItems,
    totalPrice,
    shippingFee,
    amountUntilFreeShipping,
    updateQuantity,
    removeItem,
  } = useCart();

  if (enrichedItems.length === 0) {
    return (
      <main className="min-h-screen py-10">
        <EmptyState
          title="장바구니가 비어 있습니다"
          message="원하는 도서를 담아 보세요."
          actionButton={{
            label: '도서 목록 보기',
            onClick: () => router.push('/books'),
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen py-6 pb-10">
      <h1 className="text-2xl font-semibold mb-6">장바구니</h1>

      <ul className="space-y-4">
        {enrichedItems.map((row) => (
          <li
            key={row.isbn}
            className="flex flex-col sm:flex-row gap-4 rounded-lg border border-border bg-card p-4"
          >
            <Link
              href={row.book ? `/books/${row.book.slug}` : '#'}
              className="relative aspect-[2/3] w-full max-w-[120px] shrink-0 rounded overflow-hidden bg-muted"
            >
              {row.book?.coverImage ? (
                <Image
                  src={row.book.coverImage}
                  alt={row.book.title}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  로딩
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{row.book?.title ?? row.isbn}</p>
              <p className="text-sm text-muted-foreground">{row.book?.author ?? ''}</p>
              <p className="text-sm mt-1">
                {row.book ? formatPrice(row.book.salePrice) : '-'} × {row.quantity} ={' '}
                <strong>{formatPrice(row.lineTotal)}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-h-[48px] min-w-[48px]"
                onClick={() => updateQuantity(row.isbn, Math.max(1, row.quantity - 1))}
                disabled={row.quantity <= 1}
              >
                −
              </Button>
              <span className="min-w-[2rem] text-center font-medium">{row.quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-h-[48px] min-w-[48px]"
                onClick={() => updateQuantity(row.isbn, Math.min(10, row.quantity + 1))}
                disabled={row.quantity >= 10}
              >
                +
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-[48px] text-destructive hover:text-destructive"
                onClick={() => removeItem(row.isbn)}
              >
                삭제
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-lg border border-border bg-card p-4 max-w-md">
        <p className="text-sm text-muted-foreground">
          상품 금액 <span className="float-right">{formatPrice(totalPrice)}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          배송비 <span className="float-right">{formatPrice(shippingFee)}</span>
        </p>
        {amountUntilFreeShipping > 0 && (
          <p className="text-sm text-primary mt-2">
            {formatPrice(amountUntilFreeShipping)} 더 담으면 무료배송!
          </p>
        )}
        <p className="font-semibold mt-3 pt-3 border-t border-border">
          총 결제 예정 금액{' '}
          <span className="float-right">{formatPrice(totalPrice + shippingFee)}</span>
        </p>
        <Link
          href="/checkout"
          className="mt-4 w-full min-h-[48px] inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          주문하기
        </Link>
      </section>
    </main>
  );
}
