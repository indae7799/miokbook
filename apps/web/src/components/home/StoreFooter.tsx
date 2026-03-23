import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Youtube } from 'lucide-react';
import { STORE_SOCIAL_LINKS } from '@/lib/store-quick-nav';

export default function StoreFooter() {
  return (
    <footer className="mt-10 border-t border-border bg-background pb-8 pt-8 sm:mt-16 sm:pb-12 sm:pt-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="mb-8 grid grid-cols-2 gap-5 sm:mb-16 sm:gap-8 lg:grid-cols-3 lg:gap-12">
          <div id="footer-inquiry" className="scroll-mt-24 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary sm:text-sm">고객문의</h3>
            <div className="space-y-2 text-xs text-muted-foreground sm:text-sm">
              <p className="flex items-start gap-1.5">
                <span className="shrink-0 font-medium text-foreground">Tel.</span>
                <span>041-935-1535</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="shrink-0 font-medium text-foreground">주소.</span>
                <span className="break-keep">충청남도 보령시 청소면 성당길 68</span>
              </p>
              <p className="pt-2 text-xs leading-relaxed">
                운영시간: 매일 10:00 - 18:00
                <br />
                (월요일 휴무)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex max-w-full items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="미옥서원 홈"
            >
              <Image
                src="/logo.png"
                alt="미옥서원"
                width={106}
                height={34}
                className="h-[21px] w-auto max-w-[9.5rem] object-contain object-left sm:h-[23px]"
                style={{ width: 'auto' }}
              />
            </Link>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              책을 발견하는 즐거움과
              <br />
              지역 공감이 있는 문화 공간입니다.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary sm:text-sm">가이드</h3>
            <nav className="flex flex-col gap-2 text-xs text-muted-foreground sm:text-sm">
              <Link href="/policy/terms" className="transition-colors hover:text-primary">이용약관</Link>
              <Link href="/policy/privacy" className="transition-colors hover:text-primary">개인정보처리방침</Link>
            </nav>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:gap-4 sm:pt-8 md:flex-row">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            © 2024 miokseowon. curated by c&a edu.
          </p>
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href={STORE_SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-pink-200 hover:text-pink-600"
              aria-label="인스타그램"
              title="인스타그램"
            >
              <Instagram className="size-[18px]" />
            </Link>
            <Link
              href={STORE_SOCIAL_LINKS.naverBlog}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-[11px] font-extrabold text-muted-foreground transition-colors hover:border-green-200 hover:text-green-700"
              aria-label="네이버 블로그"
              title="네이버 블로그"
            >
              N
            </Link>
            <Link
              href={STORE_SOCIAL_LINKS.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-red-200 hover:text-red-600"
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
