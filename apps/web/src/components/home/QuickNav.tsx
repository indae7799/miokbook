'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import LoginModal from '@/components/common/LoginModal';

const items = [
  { href: '/notices', label: '공지사항', external: false },
  { href: '/selected-books', label: '선정도서', external: false },
  { href: '/concerts', label: '북콘서트', external: false },
  { href: 'https://naver.me/53lKvYM7', label: '찾아오는 길', external: true },
  { href: '/inquiry', label: '고객문의', external: false, requiresAuth: true },
];

const accentClass = 'text-blue-600';
const iconSize = 'size-[30px]';
const icons = [
  (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6c-3 0-5 2-5 5v3.5c0 1.1-.4 2.2-1.1 3L10 20h16l-1.9-2.5a5 5 0 0 1-1.1-3V11c0-3-2-5-5-5z" className="text-muted-foreground" />
      <path d="M12 20h12" className="text-muted-foreground" />
      <path d="M14 24c.7 2 2.2 3 4 3s3.3-1 4-3" className={accentClass} strokeWidth="2" />
    </svg>
  ),
  (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h14v24H9z" className="text-muted-foreground" />
      <path d="M9 6l7-4 7 4" className={accentClass} strokeWidth="2" />
      <path d="M9 12h14M9 18h10" className="text-muted-foreground" />
    </svg>
  ),
  (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 12v12" className="text-muted-foreground" />
      <path d="M12 18h12" className="text-muted-foreground" />
      <path d="M18 8a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4 4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" className={accentClass} strokeWidth="2" />
      <path d="M14 18v4h8v-4" className="text-muted-foreground" />
    </svg>
  ),
  (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6c-4 0-7 3-7 7 0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" className="text-muted-foreground" />
      <circle cx="18" cy="13" r="3" className={accentClass} strokeWidth="2" />
    </svg>
  ),
  (
    <svg className={iconSize} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21l-3 3v-3H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H12z" className="text-muted-foreground" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" className={accentClass} />
      <circle cx="18" cy="14" r="1.5" fill="currentColor" className={accentClass} />
      <circle cx="24" cy="14" r="1.5" fill="currentColor" className={accentClass} />
    </svg>
  ),
];

export default function QuickNav() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navItems = items.map((item, index) => ({ ...item, icon: icons[index] }));

  const handleInquiryClick = (event: React.MouseEvent) => {
    event.preventDefault();
    if (user) {
      router.push('/inquiry');
      return;
    }

    setShowLoginModal(true);
  };

  return (
    <>
      <nav className="relative w-full">
        <div className="absolute -top-12 right-0 hidden h-8 w-[1px] bg-border/40 lg:block" />

        <ul className="flex flex-wrap items-center justify-start gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4 lg:gap-x-10">
          {navItems.map(({ href, label, external, requiresAuth, icon }) => (
            <li key={href} className="shrink-0">
              {requiresAuth ? (
                <button
                  type="button"
                  onClick={handleInquiryClick}
                  className="group flex flex-col items-center gap-2.5 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl border border-transparent bg-muted/30 transition-all duration-300 group-hover:border-border group-hover:bg-background group-hover:shadow-sm sm:size-[52px]">
                    <span className="inline-flex text-muted-foreground transition-transform duration-300 group-hover:scale-110">{icon}</span>
                  </div>
                  <span className="text-[11px] font-medium tracking-tight text-muted-foreground transition-colors group-hover:text-primary sm:text-[13px]">{label}</span>
                </button>
              ) : external ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-2.5 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl border border-transparent bg-muted/30 transition-all duration-300 group-hover:border-border group-hover:bg-background group-hover:shadow-sm sm:size-[52px]">
                    <span className="inline-flex text-muted-foreground transition-transform duration-300 group-hover:scale-110">{icon}</span>
                  </div>
                  <span className="text-[11px] font-medium tracking-tight text-muted-foreground transition-colors group-hover:text-primary sm:text-[13px]">{label}</span>
                </a>
              ) : (
                <Link
                  href={href}
                  className="group flex flex-col items-center gap-2.5 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl border border-transparent bg-muted/30 transition-all duration-300 group-hover:border-border group-hover:bg-background group-hover:shadow-sm sm:size-[52px]">
                    <span className="inline-flex text-muted-foreground transition-transform duration-300 group-hover:scale-110">{icon}</span>
                  </div>
                  <span className="text-[11px] font-medium tracking-tight text-muted-foreground transition-colors group-hover:text-primary sm:text-[13px]">{label}</span>
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
