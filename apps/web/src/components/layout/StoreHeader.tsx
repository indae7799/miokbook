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
import HeaderSearch from '@/components/layout/HeaderSearch';
import { auth } from '@/lib/firebase/client';
import { BOOK_CATEGORY_GROUPS, getBookCategoryDetailOptions, type BookCategoryGroupSlug } from '@/lib/categories';
import { STORE_QUICK_NAV_ITEMS, STORE_SOCIAL_LINKS } from '@/lib/store-quick-nav';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';

function CategoryGroupButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full touch-manipulation rounded-lg px-1 py-2 text-left text-sm transition-colors ${
        active ? 'font-semibold text-[#5f2430]' : 'text-foreground hover:bg-[#722f37]/10 hover:text-[#5f2430]'
      }`}
    >
      {label}
    </button>
  );
}

export default function StoreHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeCategoryGroup, setActiveCategoryGroup] = useState<BookCategoryGroupSlug | null>(null);
  const [headerHeight, setHeaderHeight] = useState(112);
  const accountRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const quickNavItems = useMemo(() => STORE_QUICK_NAV_ITEMS, []);
  const activeCategoryItems = activeCategoryGroup ? getBookCategoryDetailOptions(activeCategoryGroup) : [];

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
    setActiveCategoryGroup(null);
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

  useEffect(() => {
    if (!headerRef.current) return;

    const updateHeight = () => {
      setHeaderHeight(headerRef.current?.offsetHeight ?? 112);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(headerRef.current);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => {
      const next = !prev;
      if (!next) {
        setActiveCategoryGroup(null);
      }
      if (next) {
        setActiveCategoryGroup(null);
      }
      return next;
    });
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setActiveCategoryGroup(null);
  };

  const panelTopStyle = { top: `${headerHeight}px`, height: `calc(100dvh - ${headerHeight}px)` };

  return (
    <header ref={headerRef} className="sticky top-0 z-[120] border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="relative z-[130] flex h-16 items-center gap-3 lg:h-[74px] lg:gap-6">
          <button
            type="button"
            className="inline-flex size-10 touch-manipulation items-center justify-center rounded-full border border-border text-foreground"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            onClick={toggleMenu}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <Link href="/" className="shrink-0" aria-label="미옥서원 홈">
            <Image src="/logo.png" alt="미옥서원" width={128} height={40} className="h-7 w-auto object-contain sm:h-8" priority />
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
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground transition-colors hover:border-green-400 hover:text-green-700"
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
              className="relative inline-flex size-10 touch-manipulation items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-[#722f37]/40 hover:bg-[#722f37]/8 hover:text-[#722f37]"
              aria-label="장바구니"
            >
              <ShoppingCart className="size-4" />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              ) : null}
            </Link>

            <div className={`relative ${accountOpen ? 'z-[140]' : ''}`} ref={accountRef}>
              {user ? (
                <>
                  <button
                    type="button"
                    className="inline-flex size-10 touch-manipulation items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-[#722f37]/40 hover:bg-[#722f37]/8 hover:text-[#722f37]"
                    aria-label="내 계정"
                    onClick={() => setAccountOpen((prev) => !prev)}
                  >
                    <CircleUser className="size-5" />
                  </button>
                  {accountOpen ? (
                    <div className="absolute right-0 top-full z-[140] mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
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
                <Link
                  href={`/login?redirect=${encodeURIComponent(pathname || '/')}`}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-[#722f37]/40 hover:bg-[#722f37]/8 hover:text-[#722f37]"
                  aria-label="로그인"
                >
                  <CircleUser className="size-5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-[130] pb-3 lg:hidden">
          <HeaderSearch />
        </div>
      </div>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out"
          style={panelTopStyle}
          onClick={closeMenu}
          aria-label="사이드 메뉴 닫기"
        />
      ) : null}

      <aside
        className={`fixed left-0 z-[110] flex w-[34vw] max-w-[154px] min-w-[132px] flex-col border-r border-border bg-background shadow-2xl transition-all duration-300 ease-out lg:w-[232px] lg:max-w-none lg:min-w-0 ${
          menuOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-8 opacity-0'
        }`}
        style={panelTopStyle}
        aria-hidden={!menuOpen}
      >
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">카테고리</p>
            <div className="space-y-1">
              {BOOK_CATEGORY_GROUPS.map((group) => (
                <CategoryGroupButton
                  key={group.slug}
                  label={group.name}
                  active={activeCategoryGroup === group.slug}
                  onClick={() => setActiveCategoryGroup((prev) => (prev === group.slug ? null : group.slug))}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">주요 서비스</p>
            <div className="flex flex-col gap-1">
              {quickNavItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="group flex touch-manipulation items-center gap-2 rounded-lg px-1 py-2 text-sm text-foreground transition-colors hover:bg-[#722f37]/10 hover:text-[#5f2430]"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-[#5f2430]" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">소셜</p>
            <div className="flex items-center gap-2">
              <Link
                href={STORE_SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-pink-200 hover:text-pink-600"
                aria-label="인스타그램"
              >
                <Instagram className="size-4" />
              </Link>
              <Link
                href={STORE_SOCIAL_LINKS.naverBlog}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground transition-colors hover:border-green-400 hover:text-green-700"
                aria-label="네이버 블로그"
              >
                N
              </Link>
              <Link
                href={STORE_SOCIAL_LINKS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-red-200 hover:text-red-600"
                aria-label="유튜브"
              >
                <Youtube className="size-4" />
              </Link>
            </div>
          </section>
        </div>
      </aside>

      <aside
        className={`fixed left-[34vw] z-[111] w-[38vw] max-w-[176px] min-w-[152px] border-l border-border bg-background shadow-2xl transition-all duration-300 ease-out lg:left-[232px] lg:w-[224px] lg:max-w-none lg:min-w-0 ${
          menuOpen && activeCategoryGroup
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none -translate-x-8 opacity-0 delay-0'
        }`}
        style={panelTopStyle}
        aria-hidden={!menuOpen || !activeCategoryGroup}
      >
        <div className="flex h-full flex-col px-5 py-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link
              href={activeCategoryGroup ? `/books?category=${encodeURIComponent(activeCategoryGroup)}` : '/books'}
              className="whitespace-nowrap text-base font-semibold text-[#5f2430] hover:text-[#4b1c26]"
              onClick={closeMenu}
            >
              {BOOK_CATEGORY_GROUPS.find((group) => group.slug === activeCategoryGroup)?.name}
            </Link>
            <button
              type="button"
              onClick={() => setActiveCategoryGroup(null)}
              className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="카테고리 패널 닫기"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto overscroll-contain">
            {activeCategoryItems.map((item) => (
              <Link
                key={item.slug}
                href={`/books?category=${encodeURIComponent(item.slug)}`}
                onClick={closeMenu}
                className="rounded-lg px-1 py-2 touch-manipulation text-sm text-foreground transition-colors hover:bg-[#722f37]/10 hover:text-[#5f2430]"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </header>
  );
}
