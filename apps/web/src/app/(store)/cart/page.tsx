'use client';

import { type ReactNode, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ChevronRight,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import StoreFooter from '@/components/home/StoreFooter';
import { calculateMileageEarn } from '@/lib/mileage';

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function SkeletonItem() {
  return (
    <div className="flex gap-4 p-5 md:p-6">
      <div className="h-[126px] w-[90px] shrink-0 animate-pulse rounded-md bg-muted" />
      <div className="flex flex-1 flex-col gap-2.5 py-1">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-1/4 animate-pulse rounded bg-muted" />
        <div className="mt-auto flex gap-2">
          <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="text-muted-foreground/70">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { enrichedItems, totalPrice, shippingFee, amountUntilFreeShipping, updateQuantity, removeItem } = useCart();

  const isLoading = enrichedItems.some((item) => item.isLoading);
  const hasOrderableItems = enrichedItems.some((item) => item.book !== null);
  const totalCount = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);
  const listPriceTotal = enrichedItems.reduce(
    (sum, item) => sum + ((item.book?.listPrice ?? 0) * item.quantity),
    0
  );
  const discountTotal = Math.max(0, listPriceTotal - totalPrice);
  const payableAmount = totalPrice + shippingFee;
  const expectedMileage = calculateMileageEarn(totalPrice);
  const progressPercent =
    totalPrice > 0 && amountUntilFreeShipping > 0 ? Math.min(100, (totalPrice / (totalPrice + amountUntilFreeShipping)) * 100) : 100;

  useEffect(() => {
    if (isLoading) return;
    enrichedItems.forEach((item) => {
      if (!item.book && !item.fetchError) removeItem(item.isbn);
    });
  }, [enrichedItems, isLoading, removeItem]);

  if (!isLoading && enrichedItems.length === 0) {
    return (
      <>
        <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-background px-4 py-24">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#722f37]/8" />
            <div className="absolute inset-3 rounded-full bg-[#722f37]/6" />
            <ShoppingBag className="size-10 text-[#722f37]/40" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">장바구니가 비어 있습니다.</p>
            <p className="mt-2 text-sm text-muted-foreground">마음에 드는 책을 먼저 담아보세요.</p>
          </div>
          <Button
            onClick={() => router.push('/books')}
            className="h-12 rounded-md px-10 font-semibold text-white"
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
      <main className="min-h-screen bg-muted/20 pb-20">
        <div className="border-b border-border/80 bg-background">
          <div className="mx-auto max-w-6xl px-4 py-5">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-[19px] font-bold text-foreground">장바구니</h1>
              {!isLoading ? (
                <span className="text-sm text-muted-foreground">
                  총 <strong className="font-semibold text-foreground">{totalCount}</strong>권
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_332px]">
            <div className="space-y-2">
              <div className="border border-border/80 bg-background px-5 py-4">
                {amountUntilFreeShipping > 0 ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Truck className="size-4 shrink-0 text-[#722f37]" />
                        <span>
                          <strong className="text-[#722f37]">{formatPrice(amountUntilFreeShipping)}</strong> 추가 구매 시
                          무료배송
                        </span>
                      </div>
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPercent}%`, backgroundColor: '#722f37' }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#722f37]">
                    <Truck className="size-4" />
                    <span>무료배송 기준이 적용되었습니다.</span>
                  </div>
                )}
              </div>

              <div className="overflow-hidden border border-border/80 bg-background">
                <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
                  <span className="text-sm font-semibold text-foreground">선택한 상품</span>
                  {!isLoading ? <span className="text-xs text-muted-foreground">{totalCount}권</span> : null}
                </div>

                <ul className="divide-y divide-border/60">
                  {isLoading
                    ? [1, 2].map((index) => (
                        <li key={index}>
                          <SkeletonItem />
                        </li>
                      ))
                    : enrichedItems.map((row) => {
                        const listPrice = row.book?.listPrice ?? 0;
                        const salePrice = row.book?.salePrice ?? 0;
                        const discountRate =
                          row.book && listPrice > salePrice ? Math.round((1 - salePrice / listPrice) * 100) : 0;
                        const lineListPrice = listPrice * row.quantity;

                        return (
                          <li key={row.isbn} className="group flex gap-3 p-4 transition-colors hover:bg-muted/20 sm:gap-4 md:p-5">
                            <Link
                              href={row.book ? `/books/${row.book.slug}` : '#'}
                              className="relative h-[126px] w-[90px] shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted"
                            >
                              {row.book?.coverImage ? (
                                <Image
                                  src={row.book.coverImage}
                                  alt={row.book.title}
                                  fill
                                  sizes="90px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <ShoppingBag className="size-6 text-muted-foreground/30" />
                                </div>
                              )}
                            </Link>

                            <div className="flex min-w-0 flex-1 flex-col">
                              <div>
                                <Link
                                  href={row.book ? `/books/${row.book.slug}` : '#'}
                                  className="line-clamp-2 text-sm font-semibold leading-[1.5] text-foreground transition-colors hover:text-[#722f37]"
                                >
                                  {row.book?.title ?? row.isbn}
                                </Link>
                                <p className="mt-1 text-xs text-muted-foreground">{row.book?.author ?? ''}</p>
                                {row.fetchError ? (
                                  <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                                    <AlertCircle className="size-3 shrink-0" />
                                    일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
                                  </p>
                                ) : null}
                              </div>

                              <div className="mt-2.5 space-y-1">
                                <div className="flex items-baseline gap-1.5">
                                  {discountRate > 0 ? (
                                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-500">
                                      {discountRate}%
                                    </span>
                                  ) : null}
                                  <span className="tabular-nums text-base font-bold text-foreground">
                                    {row.book ? formatPrice(salePrice) : '-'}
                                  </span>
                                  {listPrice > salePrice ? (
                                    <span className="text-xs text-muted-foreground line-through">{formatPrice(listPrice)}</span>
                                  ) : null}
                                </div>
                                <p className="text-xs leading-5 text-muted-foreground">
                                  정가 {formatPrice(lineListPrice)} / 할인 {formatPrice(Math.max(0, lineListPrice - row.lineTotal))}
                                </p>
                              </div>

                              <div className="mt-auto flex flex-col gap-3 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex w-fit items-center overflow-hidden rounded-full border border-border bg-muted/30">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(row.isbn, Math.max(1, row.quantity - 1))}
                                    disabled={row.quantity <= 1}
                                    className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                                  >
                                    <Minus className="size-3" />
                                  </button>
                                  <span className="w-8 text-center text-sm font-semibold tabular-nums text-foreground">
                                    {row.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(row.isbn, Math.min(10, row.quantity + 1))}
                                    disabled={row.quantity >= 10}
                                    className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-3 sm:justify-end">
                                  <span className="text-sm font-semibold text-foreground">{formatPrice(row.lineTotal)}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(row.isbn)}
                                    className="flex size-8 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-red-50 hover:text-red-400"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border border-border/80 bg-background px-4 py-3.5">
                <TrustBadge icon={<ShieldCheck className="size-4" />} text="안전한 결제" />
                <TrustBadge icon={<RotateCcw className="size-4" />} text="7일 이내 교환/반품" />
                <TrustBadge icon={<Package className="size-4" />} text="2~3일 이내 발송" />
              </div>
            </div>

            <aside className="space-y-2 lg:sticky lg:top-20">
              <div className="overflow-hidden border border-border/80 bg-background">
                <div className="border-b border-border/80 px-4 py-3.5">
                  <h2 className="text-[15px] font-bold tracking-tight text-foreground">주문 요약</h2>
                </div>

                <div className="space-y-2.5 p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">정가</span>
                    <span className="tabular-nums font-medium text-foreground">{formatPrice(listPriceTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">배송비</span>
                    <span className="tabular-nums font-medium text-foreground">+ {formatPrice(shippingFee)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">할인가</span>
                    <span className="tabular-nums font-medium text-[#722f37]">- {formatPrice(discountTotal)}</span>
                  </div>

                  <div className="border-t border-border/80 pt-2.5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="font-bold text-foreground">결제 예정 금액</span>
                      <span className="text-[28px] font-bold tabular-nums text-[#722f37]">
                        {formatPrice(payableAmount)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">적립 예정 마일리지</span>
                      <span className="tabular-nums font-medium text-foreground">{formatPrice(expectedMileage)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 px-4 pb-4">
                  <Button
                    onClick={() => router.push('/checkout')}
                    disabled={isLoading || !hasOrderableItems}
                    className="h-10.5 w-full rounded-md text-[15px] font-bold text-white"
                    style={{ backgroundColor: '#722f37' }}
                  >
                    주문하기
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/books')}
                    className="h-10 w-full rounded-md border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    쇼핑 계속하기
                  </Button>
                </div>
              </div>

              <div className="border border-border/80 bg-background px-4 py-3.5">
                <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                  정가, 할인, 배송비를 모두 합산한 뒤 최종 결제 예정 금액을 확인해 주세요.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}
