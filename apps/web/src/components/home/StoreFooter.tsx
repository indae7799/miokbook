import Link from 'next/link';
import { Instagram, Youtube } from 'lucide-react';
import { BOOK_CATEGORIES } from '@/lib/categories';
import { STORE_QUICK_NAV_ITEMS, STORE_SOCIAL_LINKS } from '@/lib/store-quick-nav';

/** 랜딩 푸터 — 사이드 패널(드로어)과 동일한 카테고리·바로가기 링크 */
export default function StoreFooter() {
  return (
    <footer className="border-t border-border bg-background mt-10 sm:mt-16 pt-8 sm:pt-16 pb-8 sm:pb-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8 lg:gap-12 mb-8 sm:mb-16">
          <div id="footer-inquiry" className="space-y-3 scroll-mt-24">
            <h3 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-primary">고객문의</h3>
            <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <p className="flex items-start gap-1.5">
                <span className="font-medium text-foreground shrink-0">Tel.</span> 041-935-1535
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-medium text-foreground shrink-0">주소.</span>
                <span className="break-keep">충청남도 보령시 청소면 성당길 68</span>
              </p>
              <p className="pt-2 text-xs leading-relaxed">
                운영시간: 평일 10:00 - 18:00<br />
                (주말 및 공휴일 휴무)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-primary">미옥서원</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              책을 발견하는 즐거움과<br />
              지적 교감이 있는 특별한 공간입니다.
            </p>
          </div>

          <div className="space-y-3 col-span-2 lg:col-span-1">
            <h3 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-primary">메뉴</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/70">카테고리</p>
                <nav className="flex flex-col gap-1.5">
                  {BOOK_CATEGORIES.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/books?category=${encodeURIComponent(c.slug)}`}
                      className="hover:text-primary transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/70">바로가기</p>
                <nav className="flex flex-col gap-1.5">
                  {STORE_QUICK_NAV_ITEMS.map(({ href, label }) => (
                    <Link key={href} href={href} className="hover:text-primary transition-colors">
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          <div className="space-y-3 col-span-2 lg:col-span-1">
            <h3 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-primary">가이드</h3>
            <nav className="flex flex-col gap-2 text-xs sm:text-sm text-muted-foreground">
              <Link href="/policy/terms" className="hover:text-primary transition-colors">이용약관</Link>
              <Link href="/policy/privacy" className="hover:text-primary transition-colors">개인정보처리방침</Link>
            </nav>
          </div>
        </div>

        <div className="pt-6 sm:pt-8 border-t border-border/60 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">
            © 2024 miokseowon. curated by c&a edu.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={STORE_SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-pink-600 hover:border-pink-200 transition-colors"
              aria-label="인스타그램"
              title="인스타그램"
            >
              <Instagram className="size-[18px]" />
            </Link>
            <Link
              href={STORE_SOCIAL_LINKS.naverBlog}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-green-700 hover:border-green-200 transition-colors font-extrabold text-[11px]"
              aria-label="네이버 블로그"
              title="네이버 블로그"
            >
              N
            </Link>
            <Link
              href={STORE_SOCIAL_LINKS.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-red-600 hover:border-red-200 transition-colors"
              aria-label="유튜브"
              title="유튜브"
            >
              <Youtube className="size-[18px]" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
