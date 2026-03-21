/**
 * GA4 gtag 이벤트 헬퍼.
 * NEXT_PUBLIC_GA_MEASUREMENT_ID 설정 시 Analytics.tsx에서 gtag가 로드되며,
 * 호스팅(Vercel / AWS / Cloudflare 등)과 무관하게 동작합니다.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function safeGtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

export function trackSearch(searchTerm: string) {
  if (!searchTerm?.trim()) return;
  safeGtag('event', 'search', { search_term: searchTerm.trim() });
}

export interface GtagItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

export function trackAddToCart(p: {
  value: number;
  currency?: string;
  items: GtagItem[];
}) {
  safeGtag('event', 'add_to_cart', {
    currency: p.currency ?? 'KRW',
    value: p.value,
    items: p.items,
  });
}

export function trackPurchase(p: {
  transaction_id: string;
  value: number;
  currency?: string;
  items: GtagItem[];
}) {
  safeGtag('event', 'purchase', {
    transaction_id: p.transaction_id,
    value: p.value,
    currency: p.currency ?? 'KRW',
    items: p.items,
  });
}
