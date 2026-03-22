'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import LoginModal from '@/components/common/LoginModal';

/** 신간 | 선정도서 | 북콘서트 | 찾아오는길 | 고객문의 — 동일 사이즈, 포인트 색상 */
const items = [
  { href: '/new-books', label: '신간', external: false },
  { href: '/selected-books', label: '선정도서', external: false },
  { href: '/concerts', label: '북콘서트', external: false },
  { href: 'https://naver.me/53lKvYM7', label: '찾아오는길', external: true },
  { href: '/inquiry', label: '고객문의', external: false, requiresAuth: true },
];

/** 교보 스타일: 아이콘 ~60px -> 알라딘 스타일: 소형 아이콘 (~28px) */
const accentClass = 'text-blue-600';
const iconSize = 'size-[28px]';
const ICONS = [
  /* 신간 */ (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h18v24H9z" stroke="currentColor" className="text-muted-foreground" />
      <path d="M9 6v24" stroke="currentColor" className={accentClass} strokeWidth="2" />
      <path d="M9 12h18M9 18h12" stroke="currentColor" className="text-muted-foreground" />
    </svg>
  ),
  /* 선정도서 */ (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h14v24H9z" stroke="currentColor" className="text-muted-foreground" />
      <path d="M9 6l7-4 7 4" stroke="currentColor" className={accentClass} strokeWidth="2" />
      <path d="M9 12h14M9 18h10" stroke="currentColor" className="text-muted-foreground" />
    </svg>
  ),
  /* 북콘서트 */ (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 12v12" stroke="currentColor" className="text-muted-foreground" />
      <path d="M12 18h12" stroke="currentColor" className="text-muted-foreground" />
      <path d="M18 8a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4 4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" stroke="currentColor" className={accentClass} strokeWidth="2" />
      <path d="M14 18v4h8v-4" stroke="currentColor" className="text-muted-foreground" />
    </svg>
  ),
  /* 찾아오는길 */ (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6c-4 0-7 3-7 7 0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" stroke="currentColor" className="text-muted-foreground" />
      <circle cx="18" cy="13" r="3" stroke="currentColor" className={accentClass} strokeWidth="2" />
    </svg>
  ),
  /* 고객문의 */ (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21l-3 3v-3H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H12z" stroke="currentColor" className="text-muted-foreground" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" className={accentClass} />
      <circle cx="18" cy="14" r="1.5" fill="currentColor" className={accentClass} />
      <circle cx="24" cy="14" r="1.5" fill="currentColor" className={accentClass} />
    </svg>
  ),
];

export default function QuickNav() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleInquiryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      router.push('/inquiry');
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <>
      <nav className="w-full relative">
        {/* 윗 배너와 아이콘 영역을 시각적으로 잇는 기형학적 수직 라인 */}
        <div className="absolute -top-12 right-0 w-[1px] h-8 bg-border/40 hidden lg:block" />

        <ul className="flex flex-wrap gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4 lg:gap-x-10 justify-start items-center">
          {items.map(({ href, label, external, requiresAuth }, i) => (
            <li key={href} className="shrink-0">
              {requiresAuth ? (
                <button
                  type="button"
                  onClick={handleInquiryClick}
                  className="group flex flex-col items-center gap-2.5 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center size-10 sm:size-12 rounded-xl bg-muted/30 border border-transparent group-hover:bg-background group-hover:border-border group-hover:shadow-sm transition-all duration-300">
                    <span className="inline-flex text-muted-foreground transition-transform duration-300 group-hover:scale-110">{ICONS[i]}</span>
                  </div>
                  <span className="text-[11px] sm:text-[13px] font-medium tracking-tight text-muted-foreground group-hover:text-primary transition-colors">{label}</span>
                </button>
              ) : external ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-2.5 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center size-10 sm:size-12 rounded-xl bg-muted/30 border border-transparent group-hover:bg-background group-hover:border-border group-hover:shadow-sm transition-all duration-300">
                    <span className="inline-flex text-muted-foreground transition-transform duration-300 group-hover:scale-110">{ICONS[i]}</span>
                  </div>
                  <span className="text-[11px] sm:text-[13px] font-medium tracking-tight text-muted-foreground group-hover:text-primary transition-colors">{label}</span>
                </a>
              ) : (
                <Link
                  href={href}
                  className="group flex flex-col items-center gap-2.5 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center size-10 sm:size-12 rounded-xl bg-muted/30 border border-transparent group-hover:bg-background group-hover:border-border group-hover:shadow-sm transition-all duration-300">
                    <span className="inline-flex text-muted-foreground transition-transform duration-300 group-hover:scale-110">{ICONS[i]}</span>
                  </div>
                  <span className="text-[11px] sm:text-[13px] font-medium tracking-tight text-muted-foreground group-hover:text-primary transition-colors">{label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        redirectAfterLogin="/inquiry"
      />
    </>
  );
}
