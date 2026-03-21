'use client';

import { useEffect } from 'react';

function isReloadNavigation(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type) return nav.type === 'reload';

  const legacy = (performance as Performance & { navigation?: { type?: number } }).navigation;
  return legacy?.type === 1;
}

export default function ScrollTopOnReload() {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (isReloadNavigation()) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, []);

  return null;
}
