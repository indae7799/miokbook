'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BookReviewSection from '@/components/books/BookReviewSection';
import BookCard from '@/components/books/BookCard';
import { trackAddToCart } from '@/lib/gtag';

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
  return { main: match[1]!.trim(), badge: rest.length <= 6 ? rest : null };
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

  return (
    <article className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="relative aspect-[188/254] w-full max-w-[188px] shrink-0 self-start overflow-hidden rounded-lg bg-muted">
          {book.coverImage ? (
            <Image
              src={book.coverImage}
              alt={book.title}
              fill
              sizes="(max-width: 768px) 188px, 188px"
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

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-5 md:min-h-0 md:flex-row md:items-stretch md:gap-6 lg:gap-8">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col md:h-full">
              <h1 className="text-2xl font-semibold leading-snug">
                {displayTitle}
                {badge ? (
                  <span className="ml-2 inline-block rounded bg-muted px-1.5 py-0.5 align-middle text-base font-semibold text-muted-foreground">
                    {badge}
                  </span>
                ) : null}
              </h1>
              <p className="mt-1 text-muted-foreground">{book.author}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{book.publisher}</p>

              {book.publishDate || book.pageCount || book.category ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {book.publishDate ? (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                      {new Date(book.publishDate).getFullYear()}년 {new Date(book.publishDate).getMonth() + 1}월 출간
                    </span>
                  ) : null}
                  {book.pageCount ? (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                      {book.pageCount}p
                    </span>
                  ) : null}
                  {book.category ? (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                      {book.category}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xl font-semibold text-primary">{formatPrice(book.salePrice)}</span>
                {book.listPrice > book.salePrice ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(book.listPrice)}</span>
                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-xs font-bold text-rose-500">
                      {Math.round((1 - book.salePrice / book.listPrice) * 100)}%
                    </span>
                  </>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StarRating rating={book.rating} />
                {(book.reviewCount ?? 0) > 0 ? (
                  <span className="text-sm text-muted-foreground">리뷰 {book.reviewCount}개</span>
                ) : null}
              </div>

              <div className="mt-3">
                {isOutOfStock ? (
                  <Badge variant="secondary">품절</Badge>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <svg className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    2~3일 내 발송 · 무료배송
                  </span>
                )}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col md:h-full md:min-h-0 md:w-[min(100%,300px)] lg:w-[320px]">
              <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4 shadow-sm md:h-full">
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[48px] flex-1 px-4 sm:min-w-0"
                    disabled={isOutOfStock}
                    onClick={() => {
                      addItem(book.isbn, 1);
                      trackAddToCart({
                        value: book.salePrice,
                        items: [{ item_id: book.isbn, item_name: book.title, price: book.salePrice, quantity: 1 }],
                      });
                    }}
                  >
                    {isOutOfStock ? '품절' : '장바구니'}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="min-h-[48px] flex-1 px-4 sm:min-w-0"
                    disabled={isOutOfStock}
                    onClick={() => {
                      const { setDirectPurchase } = useCartStore.getState();
                      setDirectPurchase(book.isbn, 1);
                      trackAddToCart({
                        value: book.salePrice,
                        items: [{ item_id: book.isbn, item_name: book.title, price: book.salePrice, quantity: 1 }],
                      });
                      router.push('/checkout?mode=direct');
                    }}
                  >
                    바로구매
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="border-t border-border pt-6">
        <nav className="flex gap-6 border-b border-border pb-3" aria-label="상품 정보 목차">
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
            <div className="overflow-x-auto rounded-lg border border-border">
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
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <th scope="row" className="w-40 bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground sm:w-48">
                    배송안내
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">
                    <ul className="list-disc space-y-1 pl-5">
                      <li>주문 상품과 상품 특성 및 배송 지역에 따라 택배배송, 서점배송, 택사배송 등으로 배송됩니다.</li>
                      <li>일부 도서관구입도서 및 관공서의 경우 택배 배송이 불가할 수 있습니다.</li>
                      <li>도서 입고 지연의 경우 택배 배송 전 1~2일 추가 안내가 필요할 수 있습니다.</li>
                      <li>재고 및 배송 조건에 따라 당일~최대 3일 이내 배송되며, 추가 지연 시 별도 안내합니다.</li>
                      <li>도서 상품 주문은 대부분 무료배송이며, 일부 상품은 추가 배송비가 발생할 수 있습니다.</li>
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
                      <li>상품의 유효기간이 지나거나 상태가 심하게 훼손된 경우</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="bg-muted/50 px-4 py-3 text-left align-top font-medium text-foreground">
                    교환/반품이 불가능한 경우
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">
                    <ul className="list-disc space-y-1 pl-5">
                      <li>고객의 단순 변심으로 인해 상품 가치가 훼손된 경우</li>
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
                      <li>기타 문의는 고객센터 또는 1:1 문의를 이용해 주세요.</li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </article>
  );
}
