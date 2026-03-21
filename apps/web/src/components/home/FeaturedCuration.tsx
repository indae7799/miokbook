'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BookCard from '@/components/books/BookCard';
import type { BookCardBook } from '@/components/books/BookCard';
import SectionHeading from '@/components/home/SectionHeading';
import { cn } from '@/lib/utils';

export interface MainBottomBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
}

/** MD의 선택 — 좌 메인(표지·제목·소개) = 우측 3권 중 왼쪽 칸; 화살표로 돌리면 좌·우가 함께 갱신. 하단 배너 2개 고정 */
export interface FeaturedCurationBook extends BookCardBook {
  description?: string;
  recommendationText?: string;
}

export interface FeaturedCurationProps {
  books: FeaturedCurationBook[];
  recommendationText?: string;
  title?: string;
  /** CMS 추천 도서가 있을 때만 전달 — `/curation/md` 등 */
  viewAllHref?: string;
  mainBottomLeft?: MainBottomBanner | null;
  mainBottomRight?: MainBottomBanner | null;
}

/** 책소개에서 첫 한 줄(첫 문장)만 추출 — 줄바꿈 기준 */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const firstLine = trimmed.split(/[\n\r]/)[0]?.trim() ?? '';
  if (!firstLine) return '';
  return firstLine.length > 120 ? firstLine.slice(0, 120).trim() + '…' : firstLine;
}

/** 우측 표지 빈 슬롯 플레이스홀더 — 그리드 셀 안에서는 w-full */
function CoverPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative aspect-[188/254] w-full min-w-0 overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted flex items-center justify-center',
        className,
      )}
    >
      <span className="text-[10px] text-muted-foreground">—</span>
    </div>
  );
}

/** 하단 배너 빈 슬롯 플레이스홀더 */
function BannerPlaceholder({ label }: { label: string }) {
  return (
    <div className="block relative aspect-[60/19] rounded-lg overflow-hidden bg-muted border border-dashed border-muted-foreground/30">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Link href="/admin/marketing" className="text-xs text-primary hover:underline mt-1">
          배너 추가하기
        </Link>
      </div>
    </div>
  );
}

const RIGHT_PAGE = 3;

/** 우측 3칸 — 항상 순환 인덱스 (n===3일 때도 클릭 시 한 칸씩 돌아감) */
function buildRightSlots(
  books: FeaturedCurationBook[],
  offset: number,
): (FeaturedCurationBook | undefined)[] {
  const n = books.length;
  if (n === 0) return Array.from({ length: RIGHT_PAGE }, () => undefined);
  return Array.from({ length: RIGHT_PAGE }, (_, i) => books[(offset + i) % n]!);
}

export default function FeaturedCuration({
  books,
  title = 'MD의 선택',
  viewAllHref,
  mainBottomLeft = null,
  mainBottomRight = null,
}: FeaturedCurationProps) {
  const bottomLeft = mainBottomLeft;
  const bottomRight = mainBottomRight;

  const n = books.length;
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (n <= 1) setOffset(0);
    else setOffset((o) => o % n);
  }, [n]);

  const canCarousel = n > 1;

  const rightSlots = useMemo(() => buildRightSlots(books, offset), [books, offset]);
  /** 우측 3권 중 맨 왼쪽 = 좌측 큰 표지·제목·소개와 동일 도서 */
  const mainBook = rightSlots[0];

  const goPrev = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canCarousel) return;
    setOffset((o) => (o - 1 + n) % n);
  };

  const goNext = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canCarousel) return;
    setOffset((o) => (o + 1) % n);
  };

  const introText = mainBook?.description ? firstSentence(mainBook.description) : '';

  return (
    <section>
      <SectionHeading
        title={title}
        subtitle="큐레이터가 고른 이달의 추천 도서"
        className="mb-5"
        rightSlot={
          viewAllHref ? (
            <Link href={viewAllHref} className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          ) : null
        }
      />

      {/* 모바일: MD 추천 도서 최대 8권 그리드 */}
      <div className="grid grid-cols-2 gap-[19px] w-full justify-items-center md:hidden">
        {books.slice(0, 8).map((book) => (
          <BookCard key={book.isbn} book={book} compact showCart={false} hidePrice />
        ))}
      </div>

      {/* 태블릿·PC: 2열 + 캐러셀 */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-[6fr_4fr] gap-8 items-start">
        <div className="min-w-0 flex gap-4">
          {mainBook ? (
            <>
              <Link
                href={`/books/${mainBook.slug}`}
                className="relative w-[150px] shrink-0 aspect-[188/254] rounded-lg overflow-hidden bg-muted"
              >
                {mainBook.coverImage ? (
                  <Image src={mainBook.coverImage} alt={mainBook.title} fill sizes="150px" className="object-cover" priority />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">No Image</div>
                )}
              </Link>
              <div className="flex-1 min-w-0 max-w-md sm:max-w-lg">
                <div className="space-y-2">
                  <Link href={`/books/${mainBook.slug}`} className="font-bold text-base sm:text-lg hover:underline line-clamp-2 block">
                    {mainBook.title}
                  </Link>
                  {mainBook.recommendationText && (
                    <p className="text-sm text-blue-600 font-medium flex items-center gap-1">
                      <span className="inline-flex size-2 rounded-full bg-blue-600 shrink-0" />
                      {mainBook.recommendationText}
                    </p>
                  )}
                </div>
                {introText && (
                  <p className="mt-5 text-sm text-muted-foreground leading-relaxed line-clamp-3">{introText}</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex gap-4 w-full">
              <div className="relative w-[150px] shrink-0 aspect-[188/254] rounded-lg overflow-hidden bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">CMS에서 추천 도서 선택</span>
              </div>
              <div className="flex-1 text-sm text-muted-foreground">
                관리자 → CMS에서 MD 추천 도서를 등록하면 여기에 노출됩니다.
              </div>
            </div>
          )}
        </div>
        <div className="flex w-full min-w-0 flex-col items-stretch gap-3 self-end">
          <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="이전 추천 도서"
              disabled={!canCarousel}
              onClick={goPrev}
              className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-muted-foreground/20 bg-background/70 text-muted-foreground shadow-none transition-colors hover:border-muted-foreground/35 hover:bg-muted/50 hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-35 dark:border-white/10 dark:bg-background/50 dark:hover:bg-muted/30"
            >
              <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
            <div
              key={offset}
              className="grid min-w-0 w-full grid-cols-3 gap-2 py-0.5 animate-in fade-in duration-200 sm:gap-3"
            >
              {rightSlots.map((b, i) => (
                <div key={b ? `${b.isbn}-${offset}-${i}` : `empty-${offset}-${i}`} className="min-w-0 flex justify-center">
                  {b ? (
                    <Link
                      href={`/books/${b.slug}`}
                      className="relative block aspect-[188/254] w-full max-w-[120px] min-w-0 overflow-hidden rounded-lg bg-muted lg:max-w-[150px]"
                    >
                      {b.coverImage ? (
                        <Image src={b.coverImage} alt={b.title} fill sizes="(max-width:1024px) 33vw, 120px" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">No Image</div>
                      )}
                    </Link>
                  ) : (
                    <CoverPlaceholder className="max-w-[120px] lg:max-w-[150px]" />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="다음 추천 도서"
              disabled={!canCarousel}
              onClick={goNext}
              className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-muted-foreground/20 bg-background/70 text-muted-foreground shadow-none transition-colors hover:border-muted-foreground/35 hover:bg-muted/50 hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-35 dark:border-white/10 dark:bg-background/50 dark:hover:bg-muted/30"
            >
              <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* 하단 2열 그리드 — 책표지와 100px 여백 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10 md:mt-[100px]">
        {bottomLeft ? (
          <Link href={bottomLeft.linkUrl} className="block relative aspect-[60/19] rounded-lg overflow-hidden bg-muted">
            <Image src={bottomLeft.imageUrl} alt="" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
          </Link>
        ) : (
          <BannerPlaceholder label="메인 하단 배너 좌측" />
        )}
        {bottomRight ? (
          <Link href={bottomRight.linkUrl} className="block relative aspect-[60/19] rounded-lg overflow-hidden bg-muted">
            <Image src={bottomRight.imageUrl} alt="" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
          </Link>
        ) : (
          <BannerPlaceholder label="메인 하단 배너 우측" />
        )}
      </div>
    </section>
  );
}
