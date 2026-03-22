'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import BookCard from '@/components/books/BookCard';
import type { BookCardBook } from '@/components/books/BookCard';
import SectionHeading from '@/components/home/SectionHeading';
import { GRADE_TABS } from '@/lib/constants/grades';

export interface ThemeCurationItem {
  id: string;
  title: string;
  description?: string;
  books: BookCardBook[];
}

export interface ThemeCurationProps {
  items: ThemeCurationItem[];
  title?: string;
}

/** 학년 탭 ID → 뱃지 색상 */
const GRADE_BADGE_COLORS: Record<string, string> = {
  e1: 'bg-sky-100 text-sky-700',
  e2: 'bg-cyan-100 text-cyan-700',
  e3: 'bg-teal-100 text-teal-700',
  e4: 'bg-emerald-100 text-emerald-700',
  e5: 'bg-lime-100 text-lime-700',
  e6: 'bg-yellow-100 text-yellow-700',
  m1: 'bg-orange-100 text-orange-700',
  m2: 'bg-rose-100 text-rose-700',
  m3: 'bg-purple-100 text-purple-700',
};

/** 초약형(pill) 탭인지 학년 기반 탭인지 판별 */
function isGradeBased(items: ThemeCurationItem[]) {
  const gradeKeys = new Set(GRADE_TABS.map((t) => t.key));
  return items.some((item) => gradeKeys.has(item.id as typeof GRADE_TABS[number]['key']));
}

export default function ThemeCuration({ items, title = '이번 달 씨앤에이논술 선정도서' }: ThemeCurationProps) {
  const gradeBased = isGradeBased(items);
  const [activeTab, setActiveTab] = useState<string>('all');

  // 학년 순서 정렬 (GRADE_TABS 기준)
  const orderedItems = useMemo(() => {
    if (!gradeBased) return items;
    const order = GRADE_TABS.map((t) => t.key);
    return [...items].sort((a, b) => order.indexOf(a.id as typeof GRADE_TABS[number]['key']) - order.indexOf(b.id as typeof GRADE_TABS[number]['key']));
  }, [items, gradeBased]);

  // 전체 탭 책 목록 (학년 뱃지 포함용 — isbn → gradeId 맵)
  const isbnToGrade = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of orderedItems) {
      for (const book of item.books) {
        if (!map.has(book.isbn)) map.set(book.isbn, item.id);
      }
    }
    return map;
  }, [orderedItems]);

  const allBooks = useMemo(() => orderedItems.flatMap((item) => item.books), [orderedItems]);

  const activeItem = activeTab === 'all' ? null : orderedItems.find((item) => item.id === activeTab);
  const displayBooks = activeItem ? activeItem.books : allBooks;

  if (allBooks.length === 0) {
    return (
      <section className="space-y-6 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center">
        <h2 className="flex items-center justify-center gap-3 text-2xl font-bold leading-tight tracking-tight md:text-[32px]">
          <span className="home-section-title-bar h-[1.25em] w-1.5 shrink-0 md:w-2" aria-hidden />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          지금은 큐레이션 목록을 불러오지 못했습니다. 선정도서 페이지에서 둘러보실 수 있습니다.
        </p>
        <Link href="/selected-books" className="inline-block text-sm font-medium text-primary hover:underline">
          선정도서 보러 가기 →
        </Link>
      </section>
    );
  }

  // 학년 기반이 아닐 때: 기존 단순 그리드
  if (!gradeBased) {
    return (
      <section className="space-y-5 w-full min-w-0 flex flex-col items-center">
        <div className="w-full max-w-[1400px]">
          <SectionHeading
            title={title}
            subtitle="논술 강사진이 선정한 읽기 큐레이션"
            rightSlot={
              <Link href="/selected-books" className="text-sm text-primary hover:underline">
                전체 보기
              </Link>
            }
          />
        </div>
        <div className="flex justify-center w-full max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-[19px] w-full justify-items-center">
            {allBooks.map((book, i) => (
              <div key={book.isbn} className={`w-full ${i >= 8 ? 'hidden sm:block' : ''}`}>
                <BookCard book={book} compact showCart={false} hidePrice smallerCover80 />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ─── 학년 기반 탭 UI ───────────────────────────────────────────────────
  const tabs = [
    { id: 'all', label: '전체' },
    ...orderedItems.map((item) => ({ id: item.id, label: item.title })),
  ];

  return (
    <section className="space-y-5 w-full min-w-0">
      <SectionHeading
        title={title}
        subtitle="논술 강사진이 선정한 읽기 큐레이션"
        rightSlot={
          <Link href="/selected-books" className="text-sm text-primary hover:underline">
            전체 보기
          </Link>
        }
      />

      {/* ─── 탭 바 ─── */}
      {/* 모바일: 2행 5열 책갈피 스타일 */}
      <div className="sm:hidden grid grid-cols-5 gap-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const badgeColor = GRADE_BADGE_COLORS[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'relative flex flex-col items-center justify-center gap-0.5 rounded-t-lg border-x border-t px-1 py-2 text-center text-[10px] font-semibold leading-tight transition-all',
                isActive
                  ? 'border-[#722f37]/30 bg-white text-[#722f37] shadow-[0_-2px_8px_rgba(114,47,55,0.12)] z-10'
                  : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/70',
              ].join(' ')}
            >
              {tab.id !== 'all' && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${badgeColor ?? 'bg-muted text-muted-foreground'}`}>
                  {tab.label.replace('학년', '').trim()}
                </span>
              )}
              {tab.id === 'all' && (
                <span className="rounded-full bg-[#722f37] px-2 py-0.5 text-[9px] font-bold leading-none text-white">
                  전체
                </span>
              )}
              <span className={tab.id === 'all' ? 'hidden' : 'text-[9px] text-muted-foreground'}>
                {tab.label.includes('학년') ? tab.label.split('학년')[0].trim() + '년' : ''}
              </span>
              {isActive && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* 데스크탑: 가로 스크롤 알약 탭 */}
      <div className="hidden sm:flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const badgeColor = GRADE_BADGE_COLORS[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap',
                isActive
                  ? 'border-[#722f37] bg-[#722f37] text-white shadow-sm'
                  : tab.id !== 'all' && badgeColor
                    ? `border-transparent ${badgeColor} hover:opacity-80`
                    : 'border-border bg-background text-muted-foreground hover:border-[#722f37]/30 hover:text-[#722f37]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── 도서 그리드 ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-[19px] w-full justify-items-center">
        {displayBooks.map((book, i) => {
          const gradeId = isbnToGrade.get(book.isbn);
          const badgeColor = gradeId ? GRADE_BADGE_COLORS[gradeId] : undefined;
          const gradeLabel = gradeId ? orderedItems.find((it) => it.id === gradeId)?.title : undefined;
          return (
            <div key={book.isbn} className={`w-full relative ${i >= 8 && activeTab === 'all' ? 'hidden sm:block' : ''}`}>
              {/* 학년 뱃지 — 전체 탭에서만 표시 */}
              {activeTab === 'all' && gradeLabel && (
                <span className={`absolute top-1 left-1 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none pointer-events-none ${badgeColor ?? 'bg-muted text-muted-foreground'}`}>
                  {gradeLabel.replace('학년', '').trim()}
                </span>
              )}
              <BookCard book={book} compact showCart={false} hidePrice smallerCover80 />
            </div>
          );
        })}
      </div>
    </section>
  );
}
