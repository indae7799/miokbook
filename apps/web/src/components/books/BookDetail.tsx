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
  /** 책 사양: 크기 (예: 153*210mm) */
  size?: string;
  /** 책 사양: 쪽수 (예: 128쪽) */
  pageCount?: string | number;
  /** 책 사양: 무게 (예: 179g) */
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
  const match = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (!match) return { main: cleaned, badge: null };
  const rest = match[2]!.trim();
  return { main: match[1]!.trim(), badge: rest.length <= 6 ? rest : null };
}

/** PRD 9: 평점 0~5 → 별 표시 */
function StarRating({ rating = 0 }: { rating?: number }) {
  const r = Math.min(5, Math.max(0, rating));
  const full = Math.floor(r);
  const half = r - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`평점 ${r}점`}>
      {Array.from({ length: full }, (_, i) => (
        <span key={`f-${i}`} className="text-amber-500">★</span>
      ))}
      {half ? <span className="text-amber-500">½</span> : null}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e-${i}`} className="text-muted-foreground">☆</span>
      ))}
      <span className="text-sm text-muted-foreground ml-1">{r.toFixed(1)}</span>
    </span>
  );
}

const SECTIONS = [
  { id: 'description', label: '도서(상품)설명' },
  { id: 'reviews', label: '한줄평/리뷰' },
  { id: 'policy', label: '배송/반품/교환정책' },
] as const;

export default function BookDetail({ book, available, recommendedBooks = [] }: BookDetailProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const isOutOfStock = available <= 0;
  const { main: displayTitle, badge } = parseTitle(book.title);

  return (
    <article className="space-y-8">
      {/* PRD 9 상단: 좌 표지, 우 제목/저자/출판사/가격/평점/리뷰수, 버튼, 재고(품절 배지) */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative aspect-[188/254] w-full max-w-[188px] shrink-0 rounded-lg overflow-hidden bg-muted">
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
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Badge variant="destructive" className="text-base px-3 py-1">품절</Badge>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold leading-snug">
            {displayTitle}
            {badge && (
              <span className="ml-2 inline-block align-middle rounded bg-muted px-1.5 py-0.5 text-base font-semibold text-muted-foreground">
                {badge}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">{book.author}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{book.publisher}</p>
          {book.category && (
            <p className="text-sm text-muted-foreground mt-0.5">{book.category}</p>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-xl font-semibold text-primary">{formatPrice(book.salePrice)}</span>
            {book.listPrice > book.salePrice && (
              <span className="text-sm text-muted-foreground line-through">{formatPrice(book.listPrice)}</span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <StarRating rating={book.rating} />
            {(book.reviewCount ?? 0) > 0 && (
              <span className="text-sm text-muted-foreground">리뷰 {book.reviewCount}개</span>
            )}
          </div>

          <div className="mt-3">
            {isOutOfStock ? (
              <Badge variant="secondary">품절</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">재고 {available}권</span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px] px-6"
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
              className="min-h-[48px] px-6"
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

      {/* 목차 — 클릭 시 해당 섹션으로 스크롤 */}
      <section className="border-t border-border pt-6">
        <nav className="flex gap-6 border-b border-border pb-3" aria-label="상품 정보 목차">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#section-${s.id}`}
              className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* 섹션 1: 도서(상품)설명 */}
        <div id="section-description" className="pt-6 space-y-6 scroll-mt-6">
            {/* 정보고시 — KakaoTalk 스크린샷 순서: 도서명, 지음/옮김, 쪽수, 출간일, KC인증, 크기, 무게, 출판사 */}
            <div>
              <h2 className="text-lg font-semibold mb-3">정보고시</h2>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <tr>
                      <th scope="row" className="w-28 sm:w-36 px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                        도서명
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">{book.title}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                        지음/옮김
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">{book.author}</td>
                    </tr>
                    {book.pageCount != null && (
                      <tr>
                        <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                          쪽수
                        </th>
                        <td className="px-4 py-3 text-muted-foreground">{book.pageCount}</td>
                      </tr>
                    )}
                    {book.publishDate && (
                      <tr>
                        <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                          출간일
                        </th>
                        <td className="px-4 py-3 text-muted-foreground">
                          {typeof book.publishDate === 'string'
                            ? (() => {
                                const d = new Date(book.publishDate);
                                return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
                              })()
                            : '-'}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                        KC인증/인증번호
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">적합성확인</td>
                    </tr>
                    {book.size && (
                      <tr>
                        <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                          크기
                        </th>
                        <td className="px-4 py-3 text-muted-foreground">{book.size}</td>
                      </tr>
                    )}
                    {book.weight && (
                      <tr>
                        <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                          무게
                        </th>
                        <td className="px-4 py-3 text-muted-foreground">{book.weight}</td>
                      </tr>
                    )}
                    <tr>
                      <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                        출판사
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">{book.publisher}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                        ISBN
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">{book.isbn}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 책소개 */}
            {book.description && (
              <div>
                <h2 className="text-lg font-semibold mb-3">책소개</h2>
                <div className="text-muted-foreground leading-relaxed">
                  {book.description.split(/\n\n+/).map((para, i) => (
                    <p key={i} className={`whitespace-pre-line ${i > 0 ? 'mt-4' : ''}`}>{para.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {/* 저자 소개 */}
            <div>
              <h2 className="text-lg font-semibold mb-2">저자 소개</h2>
              <p className="text-muted-foreground">
                {book.author}
                {book.publisher && ` · ${book.publisher}`}
              </p>
            </div>

            {/* 목차 */}
            {book.tableOfContents && book.tableOfContents.trim() && (
              <div>
                <h2 className="text-lg font-semibold mb-2">목차</h2>
                <div className="text-muted-foreground whitespace-pre-wrap text-sm">{book.tableOfContents}</div>
              </div>
            )}

            {/* 추천 도서 */}
            {recommendedBooks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">추천 도서</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-[19px]">
                  {recommendedBooks.map((b) => (
                    <BookCard
                      key={b.isbn}
                      book={{
                        isbn: b.isbn,
                        slug: b.slug,
                        title: b.title,
                        author: b.author,
                        coverImage: b.coverImage,
                        listPrice: b.listPrice,
                        salePrice: b.salePrice,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* 섹션 2: 한줄평/리뷰 */}
        <div id="section-reviews" className="pt-10 scroll-mt-6">
          <h2 className="text-lg font-semibold mb-4">한줄평/리뷰</h2>
          <BookReviewSection isbn={book.isbn} />
        </div>

        {/* 섹션 3: 배송/반품/교환정책 */}
        <div id="section-policy" className="pt-10 scroll-mt-6">
          <h2 className="text-lg font-semibold mb-4">배송/반품/교환정책</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr>
                    <th scope="row" className="w-40 sm:w-48 px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                      배송안내
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>주문 상품은 상품 특성 및 배송 지역에 따라 택배배송, 서점배송, 회사배송 등으로 배송됩니다.</li>
                        <li>일부 우체국 사서함 및 관공서의 경우 택배 배송이 불가할 수 있습니다.</li>
                        <li>도서 산간 지역의 경우 택배 배송 시 1~2일 추가 소요될 수 있습니다.</li>
                        <li>재고 및 배송 조건에 따라 당일~최대 3일 이내 배송되며, 추가 지연 시 별도 안내됩니다.</li>
                        <li>배송비: 도서 상품 주문은 모두 무료배송입니다. 비도서 상품은 추가 배송비가 발생합니다. 도서 산간 지역은 추가 배송비가 발생할 수 있습니다.</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                      교환/반품이 가능한 경우
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>주문 내용과 다른 상품을 받은 경우</li>
                        <li>상품이 소비자에게 도착했을 때 이미 파손된 경우</li>
                        <li>상품의 유효기간이 지난 경우</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                      교환/반품이 불가능한 경우
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>고객의 실수로 상품의 일부가 분실·파손된 경우</li>
                        <li>상품 개봉(하자 제외)으로 인해 재판매가 불가능해진 경우</li>
                        <li>재생산·단기간 열람 가능 상품(잡지, 만화, 교과서, 참고서 등)의 포장·피복이 손상된 경우</li>
                        <li>세트 상품의 일부만 교환/반품하는 경우 (전체 세트만 가능)</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-foreground bg-muted/50 align-top">
                      기타 교환/반품 관련 안내
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>교환/반품의 원인이 고객의 단순 변심 또는 과실인 경우: 배송비 고객 부담</li>
                        <li>교환/반품의 원인이 상품의 하자·결함인 경우: 사이트(판매자) 부담</li>
                        <li>기타 문의: 고객센터 또는 1:1 문의</li>
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
