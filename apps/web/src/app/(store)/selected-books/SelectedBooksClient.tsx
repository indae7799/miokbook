'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart.store';
import {
  GRADE_TABS,
  DEFAULT_GRADE_TAB,
  SELECTED_BOOKS_TAB_DISPLAY_COUNT,
  type GradeKey,
} from '@/lib/constants/grades';
import type { BookCardBook } from '@/components/books/BookCard';
import StoreFooter from '@/components/home/StoreFooter';

interface Props {
  banner: { imageUrl: string; linkUrl: string } | null;
  grades: Partial<Record<GradeKey, BookCardBook[]>>;
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

/** 학년 탭 key → 짧은 뱃지 텍스트 (초1, 초2, … 중3) */
function gradeShortLabel(tabKey: string): string {
  const map: Record<string, string> = {
    e1: '초1', e2: '초2', e3: '초3', e4: '초4',
    e5: '초5', e6: '초6',
    m1: '중1', m2: '중2', m3: '중3',
  };
  return map[tabKey] ?? tabKey;
}

/** 학년별 뱃지 색 */
const GRADE_BADGE_COLORS: Record<string, string> = {
  e1: 'bg-sky-500',
  e2: 'bg-cyan-500',
  e3: 'bg-teal-500',
  e4: 'bg-emerald-500',
  e5: 'bg-lime-600',
  e6: 'bg-yellow-500',
  m1: 'bg-orange-500',
  m2: 'bg-rose-500',
  m3: 'bg-purple-500',
};

function SelectedBookCard({ book, gradeBadge, gradeKey }: { book: BookCardBook; gradeBadge?: string; gradeKey?: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const { main: displayTitle, badge } = parseTitle(book.title);

  const handleBuyNow = () => {
    addItem(book.isbn, 1);
    router.push('/checkout');
  };

  const badgeColor = gradeKey ? (GRADE_BADGE_COLORS[gradeKey] ?? 'bg-stone-500') : '';

  return (
    <article className="w-full flex flex-col group">
      <div className="relative">
        <Link
          href={`/books/${book.slug}`}
          className="block relative w-[72%] mx-auto mt-[5%] aspect-[188/254] rounded-sm shadow-md overflow-hidden bg-muted"
        >
          {book.coverImage ? (
            <Image
              src={book.coverImage}
              alt={book.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 150px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">No Image</div>
          )}
        </Link>
        {/* 학년 뱃지 — 전체 탭에서만 */}
        {gradeBadge && (
          <span className={`absolute top-0 right-[14%] z-10 rounded-b-md px-1.5 py-1 text-[10px] font-bold leading-none text-white shadow-sm ${badgeColor}`}>
            {gradeBadge}
          </span>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1.5 min-h-[110px]">
        <Link
          href={`/books/${book.slug}`}
          className="line-clamp-2 font-bold text-sm sm:text-lg leading-snug tracking-tight text-foreground hover:text-primary transition-colors"
        >
          {displayTitle}
          {badge && (
            <span className="ml-1 inline-block align-middle rounded bg-muted px-1 py-0.5 text-xs font-semibold text-muted-foreground">
              {badge}
            </span>
          )}
        </Link>
        <p className="text-[10px] text-muted-foreground">{book.author}</p>
        <div className="flex items-center gap-1.5 mt-auto flex-wrap">
          <span className="text-xs font-semibold text-primary">
            {book.salePrice.toLocaleString('ko-KR')}원
          </span>
          {book.listPrice > book.salePrice && (
            <span className="text-[10px] text-muted-foreground line-through">
              {book.listPrice.toLocaleString('ko-KR')}원
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px]" onClick={() => addItem(book.isbn, 1)}>
            <ShoppingCart className="size-3 mr-1" />
            장바구니
          </Button>
          <Button size="sm" className="flex-1 h-7 text-[11px]" onClick={handleBuyNow}>
            바로구매
          </Button>
        </div>
      </div>
    </article>
  );
}

/** 탭 버튼 공통 스타일 */
const PILL_BASE = 'shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap border';
const PILL_ACTIVE = 'border-primary bg-primary text-primary-foreground shadow-sm';
const PILL_IDLE = 'border-stone-400/55 bg-stone-200/95 text-stone-900 shadow-sm hover:border-stone-500/70 hover:bg-stone-300/95 hover:text-stone-950 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-700';

/** 모바일 책갈피 탭 스타일 */
const BOOKMARK_BASE = 'relative flex items-center justify-center rounded-t-lg border-x border-t px-1 py-2.5 text-[11px] font-bold leading-tight text-center transition-all select-none';
const BOOKMARK_ACTIVE = 'border-primary/40 bg-primary text-primary-foreground shadow-[0_-3px_10px_rgba(0,0,0,0.1)] z-10 -mb-px';
const BOOKMARK_IDLE = 'border-border bg-muted/50 text-muted-foreground hover:bg-muted';

export default function SelectedBooksClient({ banner, grades }: Props) {
  const [activeTab, setActiveTab] = useState<typeof GRADE_TABS[number]['key'] | 'all'>(DEFAULT_GRADE_TAB);

  const isAll = activeTab === 'all';
  const activeTabConfig = isAll ? null : (GRADE_TABS.find((t) => t.key === activeTab) ?? GRADE_TABS[4]);
  const activeBooks = activeTabConfig ? activeTabConfig.grades.flatMap((g) => grades[g] ?? []) : [];
  const displayedBooks = activeTabConfig ? activeBooks.slice(0, SELECTED_BOOKS_TAB_DISPLAY_COUNT) : [];

  // 전체 탭: isbn → { gradeKey, gradeShort } 맵
  const isbnToGrade = useMemo(() => {
    const map = new Map<string, { key: string; short: string }>();
    for (const tab of GRADE_TABS) {
      for (const g of tab.grades) {
        for (const book of (grades[g] ?? [])) {
          if (!map.has(book.isbn)) {
            map.set(book.isbn, { key: tab.key, short: gradeShortLabel(tab.key) });
          }
        }
      }
    }
    return map;
  }, [grades]);

  // 전체 탭: 학년 순 flat list
  const allBooks = useMemo(
    () => GRADE_TABS.flatMap((tab) => tab.grades.flatMap((g) => grades[g] ?? [])),
    [grades],
  );

  // 탭 목록: 전체 + 학년별
  const tabs = [
    { id: 'all' as const, label: '전체', shortLabel: '전체' },
    ...GRADE_TABS.map((t) => ({ id: t.key, label: t.label, shortLabel: gradeShortLabel(t.key) })),
  ];

  return (
    <>
      <div className="min-h-screen">
        {/* 배너 */}
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 pt-6">
          {banner?.imageUrl ? (
            <Link href={banner.linkUrl} className="block w-full overflow-hidden rounded-xl shadow-md">
              <div className="relative w-full aspect-[5/1]">
                <Image src={banner.imageUrl} alt="선정도서 배너" fill className="object-cover" priority sizes="(max-width: 1400px) 100vw, 1400px" />
              </div>
            </Link>
          ) : (
            <div className="w-full aspect-[5/1] rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">배너 이미지를 어드민 CMS에서 등록해 주세요.</p>
            </div>
          )}
        </div>

        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="flex items-start gap-3 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-[30px]">
              <span className="home-section-title-bar mt-[0.08em] h-[1.25em] w-1.5 shrink-0 self-start md:w-2" aria-hidden />
              이번 달 씨앤에이논술 선정도서
            </h1>
            <p className="mt-1 pl-[18px] md:pl-5 text-sm text-muted-foreground">
              논술 강사진이 학년별로 선정한 읽기 도서 목록입니다.
            </p>
          </div>

          {/* ── 모바일: 2행 5열 책갈피 탭 ── */}
          <div className="sm:hidden grid grid-cols-5 gap-x-1 gap-y-1 mb-0 border-b border-border pb-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`${BOOKMARK_BASE} ${isActive ? BOOKMARK_ACTIVE : BOOKMARK_IDLE}`}
                >
                  {tab.shortLabel}
                  {isActive && <span className="absolute -bottom-px left-0 right-0 h-px bg-background" />}
                </button>
              );
            })}
          </div>

          {/* ── 데스크탑: 가로 스크롤 알약 탭 ── */}
          <div className="hidden sm:flex overflow-x-auto gap-1 pb-2 mb-8 scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_IDLE}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 모바일 책갈피 탭과 그리드 사이 여백 */}
          <div className="sm:hidden h-4" />

          {/* ── 도서 그리드 ── */}
          {isAll ? (
            allBooks.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
                <p className="text-muted-foreground">등록된 선정도서가 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-[19px] w-full justify-items-center">
                {allBooks.map((book) => {
                  const gradeInfo = isbnToGrade.get(book.isbn);
                  return (
                    <SelectedBookCard
                      key={book.isbn}
                      book={book}
                      gradeBadge={gradeInfo?.short}
                      gradeKey={gradeInfo?.key}
                    />
                  );
                })}
              </div>
            )
          ) : activeBooks.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
              <p className="text-muted-foreground">이 학년 선정도서가 아직 등록되지 않았습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-[19px] w-full justify-items-center">
              {displayedBooks.map((book) => (
                <SelectedBookCard key={book.isbn} book={book} />
              ))}
            </div>
          )}
        </div>
      </div>
      <StoreFooter />
    </>
  );
}
