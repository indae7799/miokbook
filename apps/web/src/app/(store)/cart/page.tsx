'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
    <div className="flex gap-4 p-5 animate-pulse">
      <div className="w-[90px] h-[122px] rounded bg-muted shrink-0" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-1/4 mt-4" />
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

  const isLoading = enrichedItems.some((item) => item.book === null && item.lineTotal === 0);
  const progressPercent = Math.min(100, (totalPrice / SHIPPING_FREE_THRESHOLD) * 100);
  const totalCount = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);

  if (!isLoading && enrichedItems.length === 0) {
    return (
      <>
        <main className="min-h-[60vh] flex flex-col items-center justify-center gap-6 py-20 px-4 bg-background">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <ShoppingBag className="size-9 text-muted-foreground/40" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">장바구니가 비어 있어요</p>
            <p className="text-sm text-muted-foreground mt-1">마음에 드는 책을 담아보세요</p>
          </div>
          <Button
            onClick={() => router.push('/books')}
            className="text-white rounded px-8 h-12 font-semibold"
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
      <main className="min-h-screen bg-background py-8 pb-20 px-4 max-w-6xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8 flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-foreground">장바구니</h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">총 {totalCount}권</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* 왼쪽: 상품 목록 */}
          <div className="rounded border border-border bg-card overflow-hidden">
            {/* 무료배송 진행 바 */}
            <div className="px-5 py-4 border-b border-border bg-muted/40">
              {amountUntilFreeShipping > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Truck className="size-4" style={{ color: '#722f37' }} />
                      <span>
                        <strong style={{ color: '#722f37' }}>{formatPrice(amountUntilFreeShipping)}</strong>
                        {' '}더 담으면 무료배송
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%`, backgroundColor: '#722f37' }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#722f37' }}>
                  <Truck className="size-4" />
                  <span>무료배송 혜택이 적용되었어요!</span>
                </div>
              )}
            </div>

            {/* 상품 목록 */}
            <ul className="divide-y divide-border">
              {isLoading
                ? [1, 2].map((n) => <li key={n}><SkeletonItem /></li>)
                : enrichedItems.map((row) => {
                    const discountRate = row.book
                      ? Math.round((1 - row.book.salePrice / row.book.listPrice) * 100)
                      : 0;

                    return (
                      <li key={row.isbn} className="flex gap-4 p-5">
                        {/* 표지 */}
                        <Link
                          href={row.book ? `/books/${row.book.slug}` : '#'}
                          className="relative w-[86px] h-[118px] shrink-0 rounded overflow-hidden bg-muted shadow-sm hover:opacity-85 transition-opacity"
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

                        {/* 정보 */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <Link
                              href={row.book ? `/books/${row.book.slug}` : '#'}
                              className="font-semibold text-foreground line-clamp-2 leading-snug text-sm transition-colors hover:text-[#722f37]"
                            >
                              {row.book?.title ?? row.isbn}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-1">{row.book?.author ?? ''}</p>
                          </div>

                          <div className="mt-3 flex items-end justify-between gap-2 flex-wrap">
                            {/* 가격 */}
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                {discountRate > 0 && (
                                  <span className="text-xs font-bold text-red-500">{discountRate}%</span>
                                )}
                                <span className="text-base font-bold text-foreground">
                                  {row.book ? formatPrice(row.book.salePrice) : '-'}
                                </span>
                              </div>
                              {row.book && row.book.listPrice > row.book.salePrice && (
                                <p className="text-xs text-muted-foreground/50 line-through">{formatPrice(row.book.listPrice)}</p>
                              )}
                            </div>

                            {/* 수량 조절 */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(row.isbn, Math.max(1, row.quantity - 1))}
                                disabled={row.quantity <= 1}
                                className="size-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold text-foreground">{row.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(row.isbn, Math.min(10, row.quantity + 1))}
                                disabled={row.quantity >= 10}
                                className="size-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                              >
                                <Plus className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(row.isbn)}
                                className="size-8 ml-1 rounded flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>

                          {/* 소계 */}
                          <p className="text-xs text-muted-foreground mt-2">
                            소계{' '}
                            <strong className="text-foreground font-semibold">{formatPrice(row.lineTotal)}</strong>
                          </p>
                        </div>
                      </li>
                    );
                  })}
            </ul>
          </div>

          {/* 오른쪽: 주문 요약 */}
          <div className="lg:sticky lg:top-24 rounded border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/40">
              <h2 className="font-bold text-foreground tracking-tight">주문 요약</h2>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>상품 금액</span>
                <span className="text-foreground">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>배송비</span>
                <span className={shippingFee === 0 ? 'font-medium' : 'text-foreground'}
                  style={shippingFee === 0 ? { color: '#722f37' } : undefined}>
                  {shippingFee === 0 ? '무료' : formatPrice(shippingFee)}
                </span>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-foreground">총 결제금액</span>
                  <span className="text-xl font-bold" style={{ color: '#722f37' }}>
                    {formatPrice(totalPrice + shippingFee)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 space-y-2">
              <Button
                onClick={() => router.push('/checkout')}
                disabled={isLoading || enrichedItems.length === 0}
                className="w-full h-12 text-base font-bold text-white rounded"
                style={{ backgroundColor: '#722f37' }}
              >
                주문하기
                <ChevronRight className="size-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/books')}
                className="w-full h-10 text-sm rounded border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                쇼핑 계속하기
              </Button>
            </div>

            {/* 안내 */}
            <div className="px-5 pb-5">
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                결제 전 최종 금액과 배송 정보를 확인해 주세요. 도서는 구매 후 7일 이내 교환·반품 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}
