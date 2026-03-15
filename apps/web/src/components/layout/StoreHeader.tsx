'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ShoppingCart, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { BOOK_CATEGORIES } from '@/lib/categories';
import { BookOpen, LayoutGrid, Calendar, FileText } from 'lucide-react';
import HeaderSearch from '@/components/layout/HeaderSearch';

const quickNavItems = [
  { href: '/books', label: '도서', icon: BookOpen },
  { href: '/curation', label: '큐레이션', icon: LayoutGrid },
  { href: '/events', label: '이벤트', icon: Calendar },
  { href: '/content', label: '콘텐츠', icon: FileText },
];

export default function StoreHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          variant="ghost"
          size="icon"
          aria-label="메뉴 열기"
          className="shrink-0"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="size-6" />
        </Button>
        <Link href="/" className="shrink-0 font-semibold truncate max-w-[100px] sm:max-w-none">
          온라인 독립서점
        </Link>
        <div className="hidden sm:block flex-1 min-w-0 max-w-md">
          <HeaderSearch />
        </div>
        <Button variant="ghost" size="icon" asChild className="sm:hidden shrink-0" aria-label="검색">
          <Link href="/books">
            <Search className="size-5" />
          </Link>
        </Button>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" asChild aria-label="장바구니" className="relative">
            <Link href="/cart">
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="마이페이지">
            <Link href={user ? '/mypage' : '/login'}>
              <User className="size-5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* 좌측 햄버거 드로어: 카테고리 + 바로가기만 (캐러셀·검색창은 메인 상단에만) */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            aria-hidden
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-xl"
            role="dialog"
            aria-label="메뉴"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="font-semibold">메뉴</span>
              <Button variant="ghost" size="icon" aria-label="메뉴 닫기" onClick={() => setDrawerOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">카테고리</h2>
                <ul className="space-y-1">
                  {BOOK_CATEGORIES.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/books?category=${encodeURIComponent(c.slug)}`}
                        className="block rounded-lg px-3 py-2.5 font-medium hover:bg-accent"
                        onClick={() => setDrawerOpen(false)}
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">바로가기</h2>
                <ul className="space-y-1">
                  {quickNavItems.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium hover:bg-accent"
                        onClick={() => setDrawerOpen(false)}
                      >
                        <Icon className="size-5 text-muted-foreground" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
