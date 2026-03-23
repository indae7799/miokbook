'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  CircleUser,
  Instagram,
  LogOut,
  Menu,
  ShoppingCart,
  User,
  X,
  Youtube,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import HeaderSearch from '@/components/layout/HeaderSearch';
import { auth } from '@/lib/firebase/client';
import { BOOK_CATEGORIES } from '@/lib/categories';
import { STORE_QUICK_NAV_ITEMS, STORE_SOCIAL_LINKS } from '@/lib/store-quick-nav';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';

export default function StoreHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const categoryLinks = useMemo(
    () =>
      BOOK_CATEGORIES.map((category) => ({
        href: `/books?category=${encodeURIComponent(category.slug)}`,
        label: category.name,
      })),
    [],
  );

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex h-16 items-center gap-3 lg:h-[74px] lg:gap-6">
          {/* 햄버거 버튼 */}
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border text-foreground"
            aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <Link href="/" className="shrink-0" aria-label="미옥서원 홈">
            <Image
              src="/logo.png"
              alt="미옥서원"
              width={128}
              height={40}
              className="h-7 w-auto object-contain sm:h-8"
              priority
            />
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <HeaderSearch />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1 lg:flex">
              <Link
                href={STORE_SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-pink-200 hover:text-pink-600"
                aria-label="인스타그램"
              >
                <Instagram className="size-4" />
              </Link>
              <Link
                href={STORE_SOCIAL_LINKS.naverBlog}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground transition-colors hover:border-green-200 hover:text-green-700"
                aria-label="네이버 블로그"
              >
                N
              </Link>
              <Link
                href={STORE_SOCIAL_LINKS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-red-200 hover:text-red-600"
                aria-label="유튜브"
              >
                <Youtube className="size-4" />
              </Link>
            </div>

            <Link
              href="/cart"
              className="relative inline-flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-[#722f37]/40 hover:bg-[#722f37]/8 hover:text-[#722f37]"
              aria-label="장바구니"
            >
              <ShoppingCart className="size-4" />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              ) : null}
            </Link>

            <div className="relative" ref={accountRef}>
              {user ? (
                <>
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-[#722f37]/40 hover:bg-[#722f37]/8 hover:text-[#722f37]"
                    aria-label="내 계정"
                    onClick={() => setAccountOpen((prev) => !prev)}
                  >
                    <CircleUser className="size-5" />
                  </button>
                  {accountOpen ? (
                    <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
                      <Link href="/mypage" className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted">
                        <User className="size-4" />
                        마이페이지
                      </Link>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted"
                        onClick={handleSignOut}
                      >
                        <LogOut className="size-4" />
                        로그아웃
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <Button asChild variant="outline" className="rounded-full px-4">
                  <Link href={`/login?redirect=${encodeURIComponent(pathname || '/')}`}>로그인</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="pb-3 lg:hidden">
          <HeaderSearch />
        </div>
      </div>

      {/* 사이드 패널 오버레이 */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* 사이드 패널 */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-background shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Link href="/" onClick={() => setMobileOpen(false)} aria-label="미옥서원 홈">
            <Image
              src="/logo.png"
              alt="미옥서원"
              width={100}
              height={32}
              className="h-6 w-auto object-contain"
            />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="메뉴 닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 px-5 py-4">
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">카테고리</p>
            <div className="grid grid-cols-2 gap-1.5">
              {categoryLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-2xl border border-border bg-muted/60 px-3 py-2 text-center text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">바로가기</p>
            <div className="flex flex-col gap-0.5">
              {STORE_QUICK_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">소셜</p>
            <div className="flex items-center gap-2">
              <Link
                href={STORE_SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-pink-200 hover:text-pink-600 transition-colors"
                aria-label="인스타그램"
              >
                <Instagram className="size-4" />
              </Link>
              <Link
                href={STORE_SOCIAL_LINKS.naverBlog}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground hover:border-green-200 hover:text-green-700 transition-colors"
                aria-label="네이버 블로그"
              >
                N
              </Link>
              <Link
                href={STORE_SOCIAL_LINKS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-red-200 hover:text-red-600 transition-colors"
                aria-label="유튜브"
              >
                <Youtube className="size-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </header>
  );
}
