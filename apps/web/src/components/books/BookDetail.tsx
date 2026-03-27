'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BookReviewSection from '@/components/books/BookReviewSection';
import BookCard from '@/components/books/BookCard';
import { trackAddToCart } from '@/lib/gtag';
import CartAddedModal from '@/components/books/CartAddedModal';
import { getBookPurchaseBlockReason, isBookPurchasable } from '@/lib/book-purchase-policy';
import { calculateMileageEarn } from '@/lib/mileage';
import { DEFAULT_STORE_SETTINGS, calculateShippingFee } from '@/lib/store-settings';

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
  rating?: number;
  reviewCount?: number;
  tableOfContents?: string;
  size?: string;
  pageCount?: string | number;
  weight?: string;
}

export interface BookDetailProps {
  book: BookDetailBook;
  available: number;
  recommendedBooks?: BookDetailBook[];
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

function parseTitle(title: string): { main: string; badge: string | null } {
  const cleaned = cleanTitle(title);
  const match = cleaned.match(/^(.+?)\s*[-:|]\s*(.+)$/);
  if (!match) return { main: cleaned, badge: null };
  const rest = match[2]!.trim();
  return { main: match[1]!.trim(), badge: rest.length <= 10 ? rest : null };
}

function formatPublishDate(value: Date | string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`;
}

function StarRating({ rating = 0 }: { rating?: number }) {
  const safeRating = Math.min(5, Math.max(0, rating));
  const full = Math.floor(safeRating);
  const half = safeRating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`평점 ${safeRating}점`}>
      {Array.from({ length: full }, (_, index) => (
        <span key={`f-${index}`} className="text-amber-500">★</span>
      ))}
      {half ? <span className="text-amber-500">☆</span> : null}
      {Array.from({ length: empty }, (_, index) => (
        <span key={`e-${index}`} className="text-muted-foreground">☆</span>
      ))}
      <span className="ml-1 text-sm text-muted-foreground">{safeRating.toFixed(1)}</span>
    </span>
  );
}

const sections = [
  { id: 'description', label: '도서 설명' },
  { id: 'reviews', label: '서점 리뷰' },
  { id: 'policy', label: '배송/반품/교환 정책' },
] as const;

export default function BookDetail({ book, available, recommendedBooks = [] }: BookDetailProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const isOutOfStock = !isBookPurchasable({ status: book.status, available });
  const blockedReason = getBookPurchaseBlockReason({ status: book.status, available });
  const { main: displayTitle, badge } = parseTitle(book.title);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const salePrice = book.salePrice > 0 ? book.salePrice : book.listPrice;
  const listPrice = book.listPrice > 0 ? book.listPrice : salePrice;
  const discountAmount = Math.max(0, listPrice - salePrice);
  const discountRate = listPrice > salePrice ? Math.round((1 - salePrice / listPrice) * 100) : 0;
  const totalItemPrice = salePrice * quantity;
  const shippingFee = calculateShippingFee(totalItemPrice, DEFAULT_STORE_SETTINGS);
  const totalAmount = totalItemPrice + shippingFee;
  const expectedMileage = calculateMileageEarn(totalItemPrice);

  return (
    <>
      <CartAddedModal open={cartModalOpen} onClose={() => setCartModalOpen(false)} bookTitle={book.title} />

      {/* 하단 고정 구매 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1000px] px-4">
        <div
          className="flex items-center gap-3 pt-3 lg:justify-end"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="text-[11px] text-muted-foreground">총 결제 금액</p>
            <p className="text-[22px] font-bold leading-tight text-[#4A1728]">{formatPrice(totalAmount)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-8 text-sm font-semibold"
              disabled={isOutOfStock}
              onClick={() => {
                addItem(book.isbn, quantity);
                trackAddToCart({
                  value: totalItemPrice,
                  items: [{ item_id: book.isbn, item_name: book.title, price: salePrice, quantity }],
                });
                setCartModalOpen(true);
              }}
            >
              장바구니
            </Button>
            <Button
              type="button"
              className="h-11 px-8 text-sm font-semibold bg-[#4A1728] text-white hover:bg-[#3a1120]"
              disabled={isOutOfStock}
              onClick={() => {
                if (authLoading) return;
                const directCheckoutUrl = `/checkout?mode=direct&isbn=${book.isbn}&qty=${quantity}`;
                if (user) {
                  const { setDirectPurchase } = useCartStore.getState();
                  setDirectPurchase(book.isbn, quantity);
                  trackAddToCart({
                    value: totalItemPrice,
                    items: [{ item_id: book.isbn, item_name: book.title, price: salePrice, quantity }],
                  });
                  router.push(directCheckoutUrl);
                } else {
                  router.push(`/login?redirect=${encodeURIComponent(directCheckoutUrl)}`);
                }
              }}
            >
              바로구매
            </Button>
          </div>
        </div>
        </div>
      </div>

      <article className="space-y-10 pb-28">
        {/* 카테고리 뱃지 — 그리드 밖 */}
        {(book.category || badge) ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {book.category ? <Badge variant="outline" className="text-xs">{book.category}</Badge> : null}
            {badge ? <Badge variant="secondary" className="text-xs">{badge}</Badge> : null}
          </div>
        ) : null}

        {/* 히어로: 표지 + 정보 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">

          {/* 표지 이미지 */}
          <div className="flex justify-center sm:justify-start">
            <div className="relative w-full max-w-[160px] sm:max-w-none">
              <div className="relative aspect-[188/254] w-full overflow-hidden rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                {book.coverImage ? (
                  <Image
                    src={book.coverImage}
                    alt={book.title}
                    fill
                    sizes="(max-width: 640px) 160px, 240px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
                    No Image
                  </div>
                )}
                {isOutOfStock ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-sm">
                    <span className="rounded-sm bg-destructive px-3 py-1 text-sm font-semibold text-white">{blockedReason || '품절'}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* 도서 정보 + 구매 */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* 제목 영역 */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-[28px]">
                {displayTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <span className="font-medium text-foreground">{book.author}</span>
                {book.publisher ? (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-muted-foreground">{book.publisher}</span>
                  </>
                ) : null}
                {book.publishDate ? (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-muted-foreground">{formatPublishDate(book.publishDate)}</span>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <StarRating rating={book.rating} />
                {(book.reviewCount ?? 0) > 0 ? (
                  <span className="text-muted-foreground">리뷰 {book.reviewCount}개</span>
                ) : null}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* 가격 — label 고정폭 그리드 */}
            <div className="grid grid-cols-[5.5rem_1fr] items-center gap-y-2.5 text-sm">
              {discountRate > 0 ? (
                <>
                  <span className="text-muted-foreground">정가</span>
                  <span className="text-muted-foreground line-through decoration-1">{formatPrice(listPrice)}</span>
                </>
              ) : null}

              <span className="text-muted-foreground">판매가</span>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground">{formatPrice(salePrice)}</span>
                {discountRate > 0 ? (
                  <span className="rounded bg-[#4A1728]/10 px-1.5 py-0.5 text-xs font-bold text-[#4A1728]">
                    {discountRate}% 할인
                  </span>
                ) : null}
              </div>

              {discountRate > 0 ? (
                <>
                  <span className="text-muted-foreground">할인가</span>
                  <span className="font-medium text-[#4A1728]">– {formatPrice(discountAmount)}</span>
                </>
              ) : null}

              <span className="text-muted-foreground">배송비</span>
              <span className="text-foreground">
                {shippingFee === 0 ? '무료 (15,000원 이상)' : formatPrice(shippingFee)}
              </span>

              <span className="text-muted-foreground">출고예정</span>
              <span className="text-foreground">{isOutOfStock ? blockedReason || '품절' : '2~3일 내 발송'}</span>

              <span className="text-muted-foreground">마일리지</span>
              <span className="text-foreground">{formatPrice(expectedMileage)}</span>

              <div className="col-span-2 h-px bg-border" />

              <span className="font-medium text-foreground">총 결제금액</span>
              <span className="text-base font-bold text-[#4A1728]">{formatPrice(totalAmount)}</span>
            </div>

            <div className="h-px bg-border" />

            {/* 재고 + 수량 한 줄 */}
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isOutOfStock
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <span className={`size-1.5 rounded-full ${isOutOfStock ? 'bg-destructive' : 'bg-emerald-500'}`} />
                {isOutOfStock ? blockedReason || '품절' : '구매 가능'}
              </span>

              {!isOutOfStock ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">수량</span>
                  <div className="flex items-center overflow-hidden rounded-md border border-border">
                    <button
                      type="button"
                      aria-label="수량 감소"
                      className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <svg width="10" height="2" viewBox="0 0 10 2" fill="none"><rect width="10" height="2" rx="1" fill="currentColor"/></svg>
                    </button>
                    <span className="flex h-8 w-9 items-center justify-center border-x border-border text-sm font-medium tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="수량 증가"
                      className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:bg-muted"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="4" width="2" height="10" rx="1" fill="currentColor"/><rect y="4" width="10" height="2" rx="1" fill="currentColor"/></svg>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>


          </div>
        </div>

        <section className="border-t border-border/80 pt-5">
          <nav className="flex gap-5 border-b border-border/80 pb-3" aria-label="상품 정보 목차">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className="px-1 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {section.label}
              </a>
            ))}
          </nav>

          <div id="section-description" className="space-y-6 scroll-mt-6 pt-6">
            <div>
              <h2 className="mb-3 text-lg font-semibold">정보고시</h2>
              <div className="overflow-x-auto border border-border">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <tr>
                      <th scope="row" className="w-28 bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground sm:w-36">
                        도서명
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">{book.title}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                        저자
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">{book.author}</td>
                    </tr>
                    {book.pageCount != null ? (
                      <tr>
                        <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                          쪽수
                        </th>
                        <td className="px-4 py-3 text-muted-foreground">{book.pageCount}</td>
                      </tr>
                    ) : null}
                    {book.publishDate ? (
                      <tr>
                        <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                          출간일
                        </th>
                        <td className="px-4 py-3 text-muted-foreground">{formatPublishDate(book.publishDate)}</td>
                      </tr>
                    ) : null}
                    <tr>
                      <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                        KC인증/인증번호
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">해당사항 없음</td>
                    </tr>
                    {book.size ? (
                      <tr>
                        <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                          크기
                        </th>
                        <td className="px-4 py-3 text-muted-foreground">{book.size}</td>
                      </tr>
                    ) : null}
                    {book.weight ? (
                      <tr>
                        <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                          무게
                        </th>
                        <td className="px-4 py-3 text-muted-foreground">{book.weight}</td>
                      </tr>
                    ) : null}
                    <tr>
                      <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                        출판사
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">{book.publisher}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                        ISBN
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">{book.isbn}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {book.description ? (
              <div>
                <h2 className="mb-3 text-lg font-semibold">책 소개</h2>
                <div className="leading-relaxed text-muted-foreground">
                  {book.description.split(/\n\n+/).map((paragraph, index) => (
                    <p key={index} className={index > 0 ? 'mt-4 whitespace-pre-line' : 'whitespace-pre-line'}>
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <h2 className="mb-2 text-lg font-semibold">저자 소개</h2>
              <p className="text-muted-foreground">
                {book.author}
                {book.publisher ? ` · ${book.publisher}` : ''}
              </p>
            </div>

            {book.tableOfContents && book.tableOfContents.trim() ? (
              <div>
                <h2 className="mb-2 text-lg font-semibold">목차</h2>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">{book.tableOfContents}</div>
              </div>
            ) : null}

            {recommendedBooks.length > 0 ? (
              <div>
                <h2 className="mb-4 text-lg font-semibold">추천 도서</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {recommendedBooks.map((recommended, index) => (
                    <BookCard
                      key={recommended.isbn}
                      compact
                      showCart={false}
                      priority={index < 5}
                      book={{
                        isbn: recommended.isbn,
                        slug: recommended.slug,
                        title: recommended.title,
                        author: recommended.author,
                        coverImage: recommended.coverImage,
                        listPrice: recommended.listPrice,
                        salePrice: recommended.salePrice,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div id="section-reviews" className="scroll-mt-6 pt-10">
            <h2 className="mb-4 text-lg font-semibold">서점 리뷰</h2>
            <BookReviewSection isbn={book.isbn} />
          </div>

          <div id="section-policy" className="scroll-mt-6 pt-10">
            <h2 className="mb-4 text-lg font-semibold">배송/반품/교환 정책</h2>
            <div className="overflow-x-auto border border-border">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr>
                    <th scope="row" className="w-40 bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground sm:w-48">
                      배송안내
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ul className="list-disc space-y-1 pl-5">
                        <li>주문 상품과 상품 특성 및 배송 지역에 따라 택배배송으로 발송됩니다.</li>
                        <li>일부 도서는 입고 일정에 따라 1~2일 추가 지연이 발생할 수 있습니다.</li>
                        <li>재고 및 배송 조건에 따라 당일~최대 3일 이내 배송되며, 추가 지연 시 별도 안내합니다.</li>
                        <li>도서 상품은 15,000원 이상 구매 시 무료배송이며, 미만 주문은 배송비가 추가됩니다.</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                      교환/반품이 가능한 경우
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ul className="list-disc space-y-1 pl-5">
                        <li>주문 내용과 다른 상품을 받은 경우</li>
                        <li>상품이 파손되었거나 인쇄 불량이 있는 경우</li>
                        <li>유효기간 또는 상태 이상으로 정상 사용이 어려운 경우</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                      교환/반품이 불가한 경우
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ul className="list-disc space-y-1 pl-5">
                        <li>고객 단순 변심으로 인해 상품 가치가 훼손된 경우</li>
                        <li>상품 개봉 이후 재판매가 어려운 상태가 된 경우</li>
                        <li>세트 상품 일부만 교환 또는 반품하는 경우</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                      기타 안내
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ul className="list-disc space-y-1 pl-5">
                        <li>고객 단순 변심에 의한 교환/반품 배송비는 고객 부담입니다.</li>
                        <li>상품 하자 또는 오배송에 의한 교환/반품 배송비는 판매자 부담입니다.</li>
                        <li>추가 문의는 고객센터 또는 1:1 문의를 이용해 주세요.</li>
                      </ul>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
