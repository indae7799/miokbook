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
      <div className="w-[90px] h-[122px] rounded-lg bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4 mt-4" />
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
      <main className="min-h-[60vh] flex flex-col items-center justify-center gap-6 py-20 px-4">
        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
          <ShoppingBag className="size-9 text-gray-300" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">장바구니가 비어 있어요</p>
          <p className="text-sm text-gray-400 mt-1">마음에 드는 책을 담아보세요</p>
        </div>
        <Button
          onClick={() => router.push('/books')}
          className="bg-green-700 hover:bg-green-800 text-white rounded-xl px-8 h-12 font-semibold"
        >
          도서 둘러보기
        </Button>
      </main>
    );
  }

  return (
    <>
    <main className="min-h-screen py-8 pb-20 px-4 max-w-6xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">장바구니</h1>
        {!isLoading && (
          <p className="text-sm text-gray-400 mt-1">총 {totalCount}권</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* 왼쪽: 상품 목록 */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* 무료배송 진행 바 */}
          <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
            {amountUntilFreeShipping > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Truck className="size-4 text-green-600" />
                    <span>
                      <strong className="text-green-700">{formatPrice(amountUntilFreeShipping)}</strong> 더 담으면 무료배송!
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                <Truck className="size-4" />
                <span>무료배송 혜택이 적용되었어요!</span>
              </div>
            )}
          </div>

          {/* 상품 목록 */}
          <ul className="divide-y divide-gray-50">
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
                        className="relative w-[90px] h-[122px] shrink-0 rounded-lg overflow-hidden bg-gray-100 shadow-sm hover:opacity-90 transition-opacity"
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
                            <ShoppingBag className="size-6 text-gray-300" />
                          </div>
                        )}
                      </Link>

                      {/* 정보 */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <Link
                            href={row.book ? `/books/${row.book.slug}` : '#'}
                            className="font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-green-700 transition-colors text-sm"
                          >
                            {row.book?.title ?? row.isbn}
                          </Link>
                          <p className="text-xs text-gray-400 mt-1">{row.book?.author ?? ''}</p>
                        </div>

                        <div className="mt-3 flex items-end justify-between gap-2 flex-wrap">
                          {/* 가격 */}
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              {discountRate > 0 && (
                                <span className="text-xs font-bold text-red-500">{discountRate}%</span>
                              )}
                              <span className="text-base font-bold text-gray-900">
                                {row.book ? formatPrice(row.book.salePrice) : '-'}
                              </span>
                            </div>
                            {row.book && row.book.listPrice > row.book.salePrice && (
                              <p className="text-xs text-gray-300 line-through">{formatPrice(row.book.listPrice)}</p>
                            )}
                          </div>

                          {/* 수량 조절 */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(row.isbn, Math.max(1, row.quantity - 1))}
                              disabled={row.quantity <= 1}
                              className="size-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold">{row.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(row.isbn, Math.min(10, row.quantity + 1))}
                              disabled={row.quantity >= 10}
                              className="size-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                            >
                              <Plus className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(row.isbn)}
                              className="size-8 ml-1 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        {/* 소계 */}
                        <p className="text-xs text-gray-400 mt-2">
                          소계{' '}
                          <strong className="text-gray-700 font-semibold">{formatPrice(row.lineTotal)}</strong>
                        </p>
                      </div>
                    </li>
                  );
                })}
          </ul>
        </div>

        {/* 오른쪽: 주문 요약 */}
        <div className="lg:sticky lg:top-24 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">주문 요약</h2>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>상품 금액</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>배송비</span>
              <span className={shippingFee === 0 ? 'text-green-600 font-medium' : ''}>
                {shippingFee === 0 ? '무료' : formatPrice(shippingFee)}
              </span>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-gray-900">총 결제금액</span>
                <span className="text-xl font-bold text-green-700">
                  {formatPrice(totalPrice + shippingFee)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 space-y-2">
            <Button
              onClick={() => router.push('/checkout')}
              disabled={isLoading || enrichedItems.length === 0}
              className="w-full h-13 text-base font-bold bg-green-700 hover:bg-green-800 text-white rounded-xl"
            >
              주문하기
              <ChevronRight className="size-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/books')}
              className="w-full h-11 text-sm rounded-xl border-gray-200 text-gray-500"
            >
              쇼핑 계속하기
            </Button>
          </div>

          {/* 안내 */}
          <div className="px-5 pb-5">
            <p className="text-[11px] text-gray-300 leading-relaxed">
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
