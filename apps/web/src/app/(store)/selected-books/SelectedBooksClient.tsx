'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import BookCard, { type BookCardBook } from '@/components/books/BookCard';
import {
  GRADE_TABS,
  DEFAULT_GRADE_TAB,
  SELECTED_BOOKS_TAB_DISPLAY_COUNT,
  type GradeKey,
} from '@/lib/constants/grades';
import StoreFooter from '@/components/home/StoreFooter';

interface Props {
  banner: { imageUrl: string; linkUrl: string } | null;
  grades: Partial<Record<GradeKey, BookCardBook[]>>;
}

function gradeShortLabel(tabKey: string): string {
  const map: Record<string, string> = {
    e1: '초1',
    e2: '초2',
    e3: '초3',
    e4: '초4',
    e5: '초5',
    e6: '초6',
    m1: '중1',
    m2: '중2',
    m3: '중3',
  };
  return map[tabKey] ?? tabKey;
}

const gradeBadgeColors: Record<string, string> = {
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

const PILL_BASE = 'shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors';
const PILL_ACTIVE = 'border-primary bg-primary text-primary-foreground shadow-sm';
const PILL_IDLE = 'border-stone-400/55 bg-stone-200/95 text-stone-900 shadow-sm hover:border-stone-500/70 hover:bg-stone-300/95 hover:text-stone-950 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-700';

const BOOKMARK_BASE = 'relative flex items-center justify-center rounded-t-lg border-x border-t px-1 py-2.5 text-center text-[11px] font-bold leading-tight transition-all select-none';
const BOOKMARK_ACTIVE = 'z-10 -mb-px border-primary/40 bg-primary text-primary-foreground shadow-[0_-3px_10px_rgba(0,0,0,0.1)]';
const BOOKMARK_IDLE = 'border-border bg-muted/50 text-muted-foreground hover:bg-muted';

const GRID = 'mt-8 grid grid-cols-2 justify-items-center gap-[19px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
const SELECTED_BUY_NOW_CLASS =
  'bg-[#4A1728] text-white hover:bg-[#3A1120] focus-visible:ring-[#4A1728]';

export default function SelectedBooksClient({ banner, grades }: Props) {
  const setDirectPurchase = useCartStore((state) => state.setDirectPurchase);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const router = useRouter();
  const handleBuyNow = useCallback((isbn: string) => {
    if (authLoading) return;
    const directCheckoutUrl = `/checkout?mode=direct&isbn=${isbn}&qty=1`;
    if (user) {
      setDirectPurchase(isbn, 1);
      router.push(directCheckoutUrl);
      return;
    }
    router.push(`/login?redirect=${encodeURIComponent(directCheckoutUrl)}`);
  }, [authLoading, user, setDirectPurchase, router]);

  const [activeTab, setActiveTab] = useState<typeof GRADE_TABS[number]['key'] | 'all'>(DEFAULT_GRADE_TAB);

  const isAll = activeTab === 'all';
  const activeTabConfig = isAll ? null : (GRADE_TABS.find((tab) => tab.key === activeTab) ?? GRADE_TABS[4]);
  const activeBooks = activeTabConfig ? activeTabConfig.grades.flatMap((grade) => grades[grade] ?? []) : [];
  const displayedBooks = activeTabConfig ? activeBooks.slice(0, SELECTED_BOOKS_TAB_DISPLAY_COUNT) : [];

  const isbnToGrade = useMemo(() => {
    const map = new Map<string, { key: string; short: string }>();
    for (const tab of GRADE_TABS) {
      for (const grade of tab.grades) {
        for (const book of (grades[grade] ?? [])) {
          if (!map.has(book.isbn)) {
            map.set(book.isbn, { key: tab.key, short: gradeShortLabel(tab.key) });
          }
        }
      }
    }
    return map;
  }, [grades]);

  const allBooks = useMemo(
    () => GRADE_TABS.flatMap((tab) => tab.grades.flatMap((grade) => grades[grade] ?? [])),
    [grades],
  );

  const tabs = [
    { id: 'all' as const, label: '전체', shortLabel: '전체' },
    ...GRADE_TABS.map((tab) => ({ id: tab.key, label: tab.label, shortLabel: gradeShortLabel(tab.key) })),
  ];

  return (
    <>
      <div className="min-h-screen">
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6">
          {banner?.imageUrl ? (
            <Link href={banner.linkUrl} className="block w-full overflow-hidden rounded-xl shadow-md">
              <div className="relative aspect-[5/1] w-full">
                <Image src={banner.imageUrl} alt="선정도서 배너" fill className="object-cover" priority sizes="(max-width: 1400px) 100vw, 1400px" />
              </div>
            </Link>
          ) : (
            <div className="flex aspect-[5/1] w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">배너 이미지를 어드민 CMS에서 등록해 주세요.</p>
            </div>
          )}
        </div>

        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
          <div className="mb-6">
            <h1 className="flex items-start gap-3 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-[30px]">
              <span className="home-section-title-bar mt-[0.08em] h-[1.25em] w-1.5 shrink-0 self-start md:w-2" aria-hidden />
              이번 달 씨앤에이논술 선정도서
            </h1>
            <p className="mt-1 pl-[18px] text-sm text-muted-foreground md:pl-5">
              씨앤에이논술 강사진이 학년별로 선정한 읽기 도서 목록입니다.
            </p>
          </div>

          <div className="mb-0 grid grid-cols-5 gap-x-1 gap-y-1 border-b border-border pb-0 sm:hidden">
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
                  {isActive ? <span className="absolute -bottom-px left-0 right-0 h-px bg-background" /> : null}
                </button>
              );
            })}
          </div>

          <div className="mb-8 hidden gap-1 overflow-x-auto pb-2 scrollbar-hide sm:flex">
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

          <div className="h-4 sm:hidden" />

          {isAll ? (
            allBooks.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
                <p className="text-muted-foreground">등록된 선정도서가 없습니다.</p>
              </div>
            ) : (
              <div className={GRID}>
                {allBooks.map((book, index) => {
                  const gradeInfo = isbnToGrade.get(book.isbn);
                  const badgeColor = gradeInfo ? (gradeBadgeColors[gradeInfo.key] ?? 'bg-stone-500') : '';
                  return (
                    <BookCard
                      key={book.isbn}
                      book={book}
                      compact
                      showCart
                      priority={index < 10}
                      smallerCover80
                      onBuyNow={() => handleBuyNow(book.isbn)}
                      buyNowClassName={SELECTED_BUY_NOW_CLASS}
                      badge={gradeInfo ? (
                        <span className={`absolute right-0 top-0 z-10 rounded-bl-md px-1.5 py-1 text-[10px] font-bold leading-none text-white shadow-sm ${badgeColor}`}>
                          {gradeInfo.short}
                        </span>
                      ) : undefined}
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
            <div className={GRID}>
              {displayedBooks.map((book, index) => (
                <BookCard
                  key={book.isbn}
                  book={book}
                  compact
                  showCart
                  priority={index < 10}
                  smallerCover80
                  onBuyNow={() => handleBuyNow(book.isbn)}
                  buyNowClassName={SELECTED_BUY_NOW_CLASS}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <StoreFooter />
    </>
  );
}
