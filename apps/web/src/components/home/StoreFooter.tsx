import Link from 'next/link';

/** PRD 8 랜딩 구조 13번: Footer — 회사 정보 | 고객센터 | 이용약관 | 개인정보처리방침 */
export default function StoreFooter() {
  return (
    <footer className="border-t border-border bg-background mt-24 pt-16 pb-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* 고객문의 섹션 */}
          <div id="footer-inquiry" className="space-y-4 scroll-mt-24">
            <h3 className="text-sm font-bold tracking-widest uppercase text-primary">고객문의</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="font-medium text-foreground">Phone.</span> 041-935-1535
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium text-foreground">Address.</span> 충청남도 보령시 청소면 성당길 68
              </p>
              <p className="pt-2 text-xs leading-relaxed">
                운영시간: 평일 10:00 - 18:00<br />
                (주말 및 공휴일 휴무)
              </p>
            </div>
          </div>

          {/* 서점 정보 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-widest uppercase text-primary">미옥서원</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              책을 발견하는 즐거움과<br />
              지적 교감이 있는 특별한 공간입니다.
            </p>
          </div>

          {/* 메뉴 링크 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-widest uppercase text-primary">메뉴</h3>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/books" className="hover:text-primary transition-colors">전체 도서</Link>
              <Link href="/curation" className="hover:text-primary transition-colors">큐레이션</Link>
              <Link href="/concerts" className="hover:text-primary transition-colors">북콘서트</Link>
              <Link href="/content" className="hover:text-primary transition-colors">서점 이야기</Link>
            </nav>
          </div>

          {/* 약관 및 기타 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-widest uppercase text-primary">가이드</h3>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/policy/terms" className="hover:text-primary transition-colors">이용약관</Link>
              <Link href="/policy/privacy" className="hover:text-primary transition-colors">개인정보처리방침</Link>
            </nav>
          </div>
        </div>

        <div className="pt-8 border-t border-border/60 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">
            © 2024 miokseowon. curated by c&a edu.
          </p>
          <div className="flex gap-6 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
            <span>Instagram</span>
            <span>Blog</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
