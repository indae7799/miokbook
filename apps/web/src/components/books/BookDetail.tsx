'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BookReviewSection from '@/components/books/BookReviewSection';
import BookCard from '@/components/books/BookCard';
import { trackAddToCart } from '@/lib/gtag';
import CartAddedModal from '@/components/books/CartAddedModal';
import { calculateMileageEarn } from '@/lib/mileage';

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
  const isOutOfStock = available <= 0;
  const { main: displayTitle, badge } = parseTitle(book.title);
  const [cartModalOpen, setCartModalOpen] = useState(false);

  const salePrice = book.salePrice > 0 ? book.salePrice : book.listPrice;
  const listPrice = book.listPrice > 0 ? book.listPrice : salePrice;
  const discountAmount = Math.max(0, listPrice - salePrice);
  const discountRate = listPrice > salePrice ? Math.round((1 - salePrice / listPrice) * 100) : 0;
  const shippingFee = salePrice >= 15000 ? 0 : 3000;
  const expectedMileage = calculateMileageEarn(salePrice);
  const payableAmount = salePrice + shippingFee;

  return (
    <>
      <CartAddedModal open={cartModalOpen} onClose={() => setCartModalOpen(false)} bookTitle={book.title} />

      <article className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="relative aspect-[188/254] w-full max-w-[240px] overflow-hidden border border-border bg-muted">
            {book.coverImage ? (
              <Image
                src={book.coverImage}
                alt={book.title}
                fill
                sizes="(max-width: 1024px) 240px, 240px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">No Image</div>
            )}
            {isOutOfStock ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Badge variant="destructive" className="px-3 py-1 text-base">품절</Badge>
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_292px]">
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {book.category ? <Badge variant="outline">{book.category}</Badge> : null}
                    {badge ? <Badge variant="secondary">{badge}</Badge> : null}
                  </div>
                  <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight text-foreground">
                    {displayTitle}
                  </h1>
                  <p className="mt-2 text-base text-foreground">{book.author}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{book.publisher}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <StarRating rating={book.rating} />
                  {(book.reviewCount ?? 0) > 0 ? (
                    <span className="text-muted-foreground">리뷰 {book.reviewCount}개</span>
                  ) : null}
                  {book.publishDate ? (
                    <span className="text-muted-foreground">{formatPublishDate(book.publishDate)}</span>
                  ) : null}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">정가</span>
                      <span className="text-foreground">{formatPrice(listPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">판매가</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-[22px] font-semibold text-foreground">{formatPrice(salePrice)}</span>
                        {discountRate > 0 ? <span className="text-sm font-semibold text-[#722f37]">{discountRate}%</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">할인가</span>
                      <span className="tabular-nums font-medium text-[#722f37]">- {formatPrice(discountAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">배송비</span>
                      <span className="text-foreground">{shippingFee === 0 ? '+ 0원' : `+ ${formatPrice(shippingFee)}`}</span>
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold text-foreground">결제 예상 금액</span>
                        <span className="tabular-nums text-[28px] font-semibold tracking-tight text-foreground">{formatPrice(payableAmount)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">적립 예정 마일리지</span>
                        <span className="tabular-nums font-medium text-foreground">{formatPrice(expectedMileage)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">배송안내</span>
                      <span className="font-medium text-foreground">{shippingFee === 0 ? '도서 포함 무료배송' : '도서 15,000원 이상 무료배송'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">출고예정</span>
                      <span className="font-medium text-foreground">{isOutOfStock ? '품절' : '2~3일 내 발송'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">재고상태</span>
                      <span className={isOutOfStock ? 'font-medium text-destructive' : 'font-medium text-emerald-600'}>
                        {isOutOfStock ? '품절' : '구매 가능'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="border border-border/80 bg-background xl:sticky xl:top-24 xl:self-start">
                <div className="space-y-3 p-4">
                  <div className="border-b border-border pb-3">
                    <p className="text-sm font-medium text-foreground">구매하기</p>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      가격, 할인, 배송비를 확인한 뒤 바로 결제할 수 있습니다.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">판매가</span>
                      <span className="font-medium text-foreground">{formatPrice(salePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">배송비</span>
                      <span className="font-medium text-foreground">{shippingFee === 0 ? '+ 0원' : `+ ${formatPrice(shippingFee)}`}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
                      <span className="font-medium text-foreground">바로 결제 금액</span>
                      <span className="text-lg font-semibold text-[#722f37]">{formatPrice(payableAmount)}</span>
                    </div>
                  </div>

                  <div className="grid gap-1.5 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[46px] rounded-md"
                      disabled={isOutOfStock}
                      onClick={() => {
                        addItem(book.isbn, 1);
                        trackAddToCart({
                          value: salePrice,
                          items: [{ item_id: book.isbn, item_name: book.title, price: salePrice, quantity: 1 }],
                        });
                        setCartModalOpen(true);
                      }}
                    >
                      {isOutOfStock ? '품절' : '장바구니'}
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      className="min-h-[46px] rounded-md"
                      disabled={isOutOfStock}
                      onClick={() => {
                        const { setDirectPurchase } = useCartStore.getState();
                        setDirectPurchase(book.isbn, 1);
                        trackAddToCart({
                          value: salePrice,
                          items: [{ item_id: book.isbn, item_name: book.title, price: salePrice, quantity: 1 }],
                        });
                        router.push('/checkout?mode=direct');
                      }}
                    >
                      바로구매
                    </Button>
                  </div>
                </div>
              </aside>
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
