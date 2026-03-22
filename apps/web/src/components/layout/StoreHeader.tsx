'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu,
  X,
  ShoppingCart,
  User,
  LogOut,
  LayoutGrid,
  Instagram,
  Youtube,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { BOOK_CATEGORIES } from '@/lib/categories';
import { STORE_QUICK_NAV_ITEMS, STORE_SOCIAL_LINKS } from '@/lib/store-quick-nav';
import HeaderSearch from '@/components/layout/HeaderSearch';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function StoreHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      {/* ─── 헤더 ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background shadow-sm">

        {/* 행 1: 햄버거 | 로고 | 검색(sm+) | 소셜(lg) | 장바구니 | 유저 */}
        <div className="flex h-14 sm:h-16 w-full items-center gap-2 sm:gap-3 px-3 sm:px-4 mx-auto max-w-[1400px]">

          {/* 햄버거 */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="메뉴 열기"
            className="shrink-0 rounded-full hover:bg-accent size-9 sm:size-10"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="size-5 sm:size-6" />
          </Button>

          {/* 로고 — 모바일에서 햄버거에 가깝게 */}
          <Link href="/" className="shrink-0 ml-0.5 sm:ml-2 group" aria-label="미옥서원 홈">
            <Image
              src="/logo.png"
              alt="미옥서원"
              width={106}
              height={34}
              className="h-[30px] sm:h-[34px] w-auto object-contain transition-transform group-hover:scale-105"
              priority
            />
          </Link>

          {/* 검색창 — sm 이상만 헤더 행에 표시 */}
          <div className="hidden sm:flex flex-1 min-w-0 justify-center px-4">
            <div className="w-full max-w-xl">
              <HeaderSearch />
            </div>
          </div>

          {/* 소셜 아이콘 — lg 이상에서만 표시 */}
          <div className="hidden lg:flex items-center gap-2 mr-2 shrink-0">
            <Link
              href={STORE_SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 border border-gray-200 rounded-md bg-white flex items-center justify-center text-gray-500 hover:text-pink-600 hover:border-pink-200 transition-all shadow-sm"
              title="인스타그램"
            >
              <Instagram className="size-5" />
            </Link>
            <Link
              href={STORE_SOCIAL_LINKS.naverBlog}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 border border-gray-200 rounded-md bg-white flex items-center justify-center text-gray-500 hover:text-green-600 hover:border-green-200 transition-all shadow-sm font-bold text-xs"
              title="네이버 블로그"
            >
              N
            </Link>
            <Link
              href={STORE_SOCIAL_LINKS.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 border border-gray-200 rounded-md bg-white flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
              title="유튜브"
            >
              <Youtube className="size-5" />
            </Link>
          </div>

          {/* 우측 아이콘 그룹 — 모바일도 우측 정렬 */}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label="장바구니"
              className="relative hover:bg-accent rounded-full transition-all size-9 sm:size-10"
            >
              <Link href="/cart">
                <ShoppingCart className="size-[19px] sm:size-[21px] text-gray-700" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-700 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            </Button>

            <div className="relative group/user">
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-accent transition-all size-9 sm:size-10"
                    aria-label="사용자 메뉴"
                  >
                    <User className="size-[19px] sm:size-[21px] text-gray-700" />
                  </Button>
                  <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all duration-200 z-[100]">
                    <div className="w-48 rounded-xl border border-border bg-white p-2 shadow-lg ring-1 ring-black/5">
                      <div className="px-3 py-2 border-b border-gray-50 mb-1">
                        <p className="text-xs text-gray-400">안녕하세요</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{user.displayName || '회원님'}</p>
                      </div>
                      <Link
                        href="/mypage"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-accent transition-colors"
                      >
                        <LayoutGrid className="size-4" />
                        마이페이지
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="size-4" />
                        로그아웃
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-accent transition-all size-9 sm:size-10"
                    aria-label="로그인"
                  >
                    <User className="size-[19px] sm:size-[21px] text-gray-700" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 행 2: 모바일 전용 — 검색창 + 소셜 아이콘 */}
        <div className="sm:hidden border-t border-border/40 flex items-center gap-2 px-3 py-2 bg-background">
          <div className="flex-1 min-w-0">
            <HeaderSearch />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href={STORE_SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-pink-600 hover:border-pink-200 transition-all"
              title="인스타그램"
            >
              <Instagram className="size-3.5" />
            </Link>
            <Link
              href={STORE_SOCIAL_LINKS.naverBlog}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-green-600 hover:border-green-200 transition-all font-extrabold text-[11px]"
              title="네이버 블로그"
            >
              N
            </Link>
            <Link
              href={STORE_SOCIAL_LINKS.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200 transition-all"
              title="유튜브"
            >
              <Youtube className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 좌측 드로어 ──────────────────────────────────────── */}
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
            <div className="flex h-14 items-center justify-between border-b border-border pl-7 pr-4">
              <span className="font-semibold">메뉴</span>
              <Button variant="ghost" size="icon" aria-label="메뉴 닫기" onClick={() => setDrawerOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 pl-7 pr-4">
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">카테고리</h2>
                <ul className="space-y-1">
                  {BOOK_CATEGORIES.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/books?category=${encodeURIComponent(c.slug)}`}
                        className="block rounded-lg border border-transparent px-3 py-2.5 text-[15px] font-medium text-foreground/90 transition-colors duration-150 hover:border-border hover:bg-stone-200/90 hover:text-[var(--section-burgundy)] dark:hover:bg-zinc-700/85 dark:hover:text-rose-200"
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
                  {STORE_QUICK_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-[15px] font-medium text-foreground/90 transition-colors duration-150 hover:border-border hover:bg-stone-200/90 hover:text-[var(--section-burgundy)] dark:hover:bg-zinc-700/85 dark:hover:text-rose-200"
                        onClick={() => setDrawerOpen(false)}
                      >
                        <Icon className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-[var(--section-burgundy)] dark:group-hover:text-rose-200" />
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
