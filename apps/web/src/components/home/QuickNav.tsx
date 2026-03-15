'use client';

import Link from 'next/link';
import { BookOpen, BookMarked, LayoutGrid, Calendar, Music } from 'lucide-react';

/** PRD 8 랜딩 구조 3번: QuickNav — 신간 | 이달의 책 | MD 추천 | 이벤트 | 북콘서트 (순서·링크 고정) */
const items = [
  { href: '/books?sort=latest', label: '신간', icon: BookOpen },
  { href: '/curation/monthly', label: '이달의 책', icon: BookMarked },
  { href: '/curation/md', label: 'MD 추천', icon: LayoutGrid },
  { href: '/events', label: '이벤트', icon: Calendar },
  { href: '/events?type=book_concert', label: '북콘서트', icon: Music },
];

export default function QuickNav() {
  return (
    <nav className="w-full overflow-x-auto scrollbar-hide -mx-1 px-1">
      <ul className="flex gap-2 min-w-0 py-2">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              className="flex flex-col items-center gap-1 min-h-[48px] min-w-[64px] justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Icon className="size-5 text-muted-foreground" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
