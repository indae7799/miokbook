'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Trash2, ShoppingBag, ChevronRight, Truck, Minus, Plus } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import StoreFooter from '@/components/home/StoreFooter';

const SHIPPING_FREE_THRESHOLD = 15000;

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function SkeletonItem() {
  return (
    <div className="flex animate-pulse gap-4 p-5">
      <div className="h-[122px] w-[90px] shrink-0 rounded bg-muted" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="mt-4 h-3 w-1/4 rounded bg-muted" />
      </div>
    </div>
  );
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

  const isLoading = enrichedItems.some((item) => item.isLoading);
  const progressPercent = Math.min(100, (totalPrice / SHIPPING_FREE_THRESHOLD) * 100);

  useEffect(() => {
    if (isLoading) return;
    enrichedItems.forEach((item) => {
      if (!item.book) removeItem(item.isbn);
    });
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalCount = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);

  if (!isLoading && enrichedItems.length === 0) {
    return (
      <>
        <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-background px-4 py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-9 text-muted-foreground/40" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">장바구니가 비어 있어요</p>
            <p className="mt-1 text-sm text-muted-foreground">마음에 드는 책을 담아보세요.</p>
          </div>
          <Button
            onClick={() => router.push('/books')}
            className="h-12 rounded px-8 font-semibold text-white"
            style={{ backgroundColor: '#722f37' }}
          >
            도서 둘러보기
          </Button>
        </main>
        <StoreFooter />
      </>
    );
  }

  return (
    <>
      <main className="mx-auto min-h-screen max-w-6xl bg-background px-4 py-8 pb-20">
        <div className="mb-8 flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-foreground">장바구니</h1>
          {!isLoading ? (
            <p className="text-sm text-muted-foreground">총 {totalCount}권</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="overflow-hidden rounded border border-border bg-card">
            <div className="border-b border-border bg-muted/40 px-5 py-4">
              {amountUntilFreeShipping > 0 ? (
                <>
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Truck className="size-4" style={{ color: '#722f37' }} />
                      <span>
                        <strong style={{ color: '#722f37' }}>{formatPrice(amountUntilFreeShipping)}</strong>
                        {' '}더 담으면 무료배송
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%`, backgroundColor: '#722f37' }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#722f37' }}>
                  <Truck className="size-4" />
                  <span>무료배송 혜택이 적용되었어요.</span>
                </div>
              )}
            </div>

            <ul className="divide-y divide-border">
              {isLoading
                ? [1, 2].map((index) => (
                    <li key={index}>
                      <SkeletonItem />
                    </li>
                  ))
                : enrichedItems.map((row) => {
                    const discountRate = row.book
                      ? Math.round((1 - row.book.salePrice / row.book.listPrice) * 100)
                      : 0;

                    return (
                      <li key={row.isbn} className="flex gap-4 p-5">
                        <Link
                          href={row.book ? `/books/${row.book.slug}` : '#'}
                          className="relative h-[118px] w-[86px] shrink-0 overflow-hidden rounded bg-muted shadow-sm transition-opacity hover:opacity-85"
                        >
                          {row.book?.coverImage ? (
                            <Image
                              src={row.book.coverImage}
                              alt={row.book.title}
                              fill
                              sizes="86px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ShoppingBag className="size-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <Link
                              href={row.book ? `/books/${row.book.slug}` : '#'}
                              className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-[#722f37]"
                            >
                              {row.book?.title ?? row.isbn}
                            </Link>
                            <p className="mt-1 text-xs text-muted-foreground">{row.book?.author ?? ''}</p>
                          </div>

                          <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                {discountRate > 0 ? (
                                  <span className="text-xs font-bold text-red-500">{discountRate}%</span>
                                ) : null}
                                <span className="text-base font-bold text-foreground">
                                  {row.book ? formatPrice(row.book.salePrice) : '-'}
                                </span>
                              </div>
                              {row.book && row.book.listPrice > row.book.salePrice ? (
                                <p className="text-xs text-muted-foreground/50 line-through">
                                  {formatPrice(row.book.listPrice)}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(row.isbn, Math.max(1, row.quantity - 1))}
                                disabled={row.quantity <= 1}
                                className="flex size-8 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold text-foreground">{row.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(row.isbn, Math.min(10, row.quantity + 1))}
                                disabled={row.quantity >= 10}
                                className="flex size-8 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                              >
                                <Plus className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(row.isbn)}
                                className="ml-1 flex size-8 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>

                          <p className="mt-2 text-xs text-muted-foreground">
                            합계 <strong className="font-semibold text-foreground">{formatPrice(row.lineTotal)}</strong>
                          </p>
                        </div>
                      </li>
                    );
                  })}
            </ul>
          </div>

          <div className="overflow-hidden rounded border border-border bg-card lg:sticky lg:top-24">
            <div className="border-b border-border bg-muted/40 px-5 py-4">
              <h2 className="font-bold tracking-tight text-foreground">주문 요약</h2>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>상품 금액</span>
                <span className="text-foreground">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>배송비</span>
                <span
                  className={shippingFee === 0 ? 'font-medium' : 'text-foreground'}
                  style={shippingFee === 0 ? { color: '#722f37' } : undefined}
                >
                  {shippingFee === 0 ? '무료' : formatPrice(shippingFee)}
                </span>
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-foreground">총 결제금액</span>
                  <span className="text-xl font-bold" style={{ color: '#722f37' }}>
                    {formatPrice(totalPrice + shippingFee)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 px-5 pb-5">
              <Button
                onClick={() => router.push('/checkout')}
                disabled={isLoading || enrichedItems.length === 0}
                className="h-12 w-full rounded text-base font-bold text-white"
                style={{ backgroundColor: '#722f37' }}
              >
                주문하기
                <ChevronRight className="ml-1 size-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/books')}
                className="h-10 w-full rounded border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                쇼핑 계속하기
              </Button>
            </div>

            <div className="px-5 pb-5">
              <p className="text-[11px] leading-relaxed text-muted-foreground/60">
                결제 전 최종 금액과 배송 정보를 확인해 주세요. 도서는 구매 후 7일 이내 교환과 반품이 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}
