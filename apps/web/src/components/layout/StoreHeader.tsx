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
  Calendar,
  FileText,
  Instagram,
  Youtube,
  GraduationCap,
  Mic2,
  TrendingUp,
  Sparkles,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { BOOK_CATEGORIES } from '@/lib/categories';
import HeaderSearch from '@/components/layout/HeaderSearch';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

/** 사이드 패널 바로가기 — 각 항목 실제 스토어 경로 */
const quickNavItems = [
  { href: '/concerts', label: '북콘서트', icon: Mic2 },
  { href: '/selected-books', label: '선정도서', icon: GraduationCap },
  { href: '/bestsellers', label: '베스트셀러', icon: TrendingUp },
  { href: '/new-books', label: '신간도서', icon: Sparkles },
  { href: '/bulk-order', label: '대량구매', icon: Package },
  { href: '/content', label: '콘텐츠', icon: FileText },
  { href: '/events', label: '이벤트', icon: Calendar },
];

export default function StoreHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      // 로그아웃 후 홈으로 이동 또는 상태 초기화는 auth listener가 처리
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background shadow-sm">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-3 py-2 sm:px-4 md:h-16 md:flex-row md:items-center md:gap-3 md:py-0">
          <div className="flex w-full min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              aria-label="메뉴 열기"
              className="shrink-0 rounded-full hover:bg-accent max-md:h-12 max-md:w-12 max-md:min-h-[48px] max-md:min-w-[48px]"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="size-6" />
            </Button>

            <Link href="/" className="group ml-0.5 shrink-0 touch-manipulation p-1 sm:ml-2 sm:p-0" aria-label="미옥서원 홈">
              <Image
                src="/logo.png"
                alt="미옥서원"
                width={100}
                height={32}
                className="h-7 w-auto object-contain transition-transform group-hover:scale-105 sm:h-8"
                priority
              />
            </Link>

            <div className="hidden min-w-0 flex-1 justify-center px-2 sm:flex md:px-4">
              <div className="w-full max-w-xl">
                <HeaderSearch />
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5 sm:gap-1.5 md:gap-3">
              <div className="flex items-center gap-1.5 sm:mr-1 sm:gap-2 md:mr-2">
                <Link
                  href="https://www.instagram.com/miokbookgarden_official/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 touch-manipulation items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-pink-200 hover:text-pink-600 max-md:min-h-11 max-md:min-w-11 max-md:size-11 sm:size-9"
                  title="인스타그램"
                >
                  <Instagram className="size-4 sm:size-5" />
                </Link>
                <Link
                  href="https://blog.naver.com/miokbookgarden"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 touch-manipulation items-center justify-center rounded-md border border-gray-200 bg-white text-xs font-bold text-gray-500 shadow-sm transition-all hover:border-green-200 hover:text-green-600 max-md:min-h-11 max-md:min-w-11 max-md:size-11 sm:size-9"
                  title="네이버 블로그"
                >
                  N
                </Link>
                <Link
                  href="https://www.youtube.com/@cnanonsul/featured"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 touch-manipulation items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-red-200 hover:text-red-600 max-md:min-h-11 max-md:min-w-11 max-md:size-11 sm:size-9"
                  title="유튜브"
                >
                  <Youtube className="size-4 sm:size-5" />
                </Link>
              </div>

            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label="장바구니"
              className="relative max-md:h-12 max-md:w-12 max-md:min-h-[48px] max-md:min-w-[48px] rounded-full transition-all hover:bg-accent"
            >
              <Link href="/cart" className="touch-manipulation">
                <ShoppingCart className="size-[21px] text-gray-700" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-700 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
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
                    className="max-md:h-12 max-md:w-12 max-md:min-h-[48px] max-md:min-w-[48px] rounded-full transition-all hover:bg-accent touch-manipulation"
                    aria-label="사용자 메뉴"
                  >
                    <User className="size-[21px] text-gray-700" />
                  </Button>
                  
                  {/* Profile Dropdown Menu (Only for logged in users) */}
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
                <Link href="/login" className="touch-manipulation">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="max-md:h-12 max-md:w-12 max-md:min-h-[48px] max-md:min-w-[48px] rounded-full transition-all hover:bg-accent"
                    aria-label="로그인"
                  >
                    <User className="size-[21px] text-gray-700" />
                  </Button>
                </Link>
              )}
            </div>
            </div>
          </div>

          <div className="w-full pb-1 pt-0.5 md:hidden">
            <HeaderSearch />
          </div>
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
            <div className="flex min-h-14 items-center justify-between border-b border-border pl-6 pr-3 sm:pl-7 sm:pr-4">
              <span className="font-semibold">메뉴</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="메뉴 닫기"
                className="min-h-11 min-w-11 shrink-0 touch-manipulation"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 pl-7 pr-4">
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">카테고리</h2>
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/books"
                      className="flex min-h-[48px] items-center rounded-lg border border-transparent px-3 py-3 text-[15px] font-medium text-foreground/90 touch-manipulation transition-colors duration-150 hover:border-border hover:bg-stone-200/90 hover:text-[var(--section-burgundy)] dark:hover:bg-zinc-700/85 dark:hover:text-rose-200 active:bg-stone-200/70"
                      onClick={() => setDrawerOpen(false)}
                    >
                      전체
                    </Link>
                  </li>
                  {BOOK_CATEGORIES.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/books?category=${encodeURIComponent(c.slug)}`}
                        className="flex min-h-[48px] items-center rounded-lg border border-transparent px-3 py-3 text-[15px] font-medium text-foreground/90 touch-manipulation transition-colors duration-150 hover:border-border hover:bg-stone-200/90 hover:text-[var(--section-burgundy)] dark:hover:bg-zinc-700/85 dark:hover:text-rose-200 active:bg-stone-200/70"
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
                        className="group flex min-h-[48px] items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-[15px] font-medium text-foreground/90 touch-manipulation transition-colors duration-150 hover:border-border hover:bg-stone-200/90 hover:text-[var(--section-burgundy)] dark:hover:bg-zinc-700/85 dark:hover:text-rose-200 active:bg-stone-200/70"
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
