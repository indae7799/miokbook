'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function isReloadNavigation(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type) return nav.type === 'reload';

  const legacy = (performance as Performance & { navigation?: { type?: number } }).navigation;
  return legacy?.type === 1;
}

export default function ScrollTopOnReload() {
  const pathname = usePathname();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || window.scrollY > 0) {
        scrollToTop();
      }
    };

    if (isReloadNavigation()) {
      scrollToTop();
    }

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
