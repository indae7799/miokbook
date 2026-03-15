import Link from 'next/link';

/** PRD 8 랜딩 구조 13번: Footer — 회사 정보 | 고객센터 | 이용약관 | 개인정보처리방침 */
export default function StoreFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-10 py-8">
      <div className="container mx-auto px-4">
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/content" className="hover:text-foreground">
            서점 이야기
          </Link>
          <a href="mailto:help@example.com" className="hover:text-foreground">
            고객센터
          </a>
          <Link href="/terms" className="hover:text-foreground">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            개인정보처리방침
          </Link>
        </nav>
        <p className="text-center text-xs text-muted-foreground mt-4">
          © 온라인 독립서점. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
