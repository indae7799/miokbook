'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { useCartStore } from '@/store/cart.store';
import { useSearchHistoryStore } from '@/store/searchHistory.store';
import ToastProvider from '@/components/common/ToastProvider';
import StoreHeader from '@/components/layout/StoreHeader';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,   // 5분 — 페이지 이동 시 불필요한 재요청 방지
        gcTime: 30 * 60 * 1000,     // 30분 — 캐시 데이터 충분히 보존
        retry: 2,                   // 모바일 네트워크 불안정 대비 재시도 2회
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,   // 네트워크 재연결 시 자동 갱신
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

// PRD Section 7: Zustand skipHydration 패치 (useEffect)
function RehydrateStores({ children }: { children: ReactNode }) {
  const cartRehydrate = (useCartStore as { persist?: { rehydrate?: () => void } }).persist?.rehydrate;
  const searchRehydrate = (useSearchHistoryStore as { persist?: { rehydrate?: () => void } }).persist?.rehydrate;
  useEffect(() => {
    cartRehydrate?.();
    searchRehydrate?.();
  }, [cartRehydrate, searchRehydrate]);
  return <>{children}</>;
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <RehydrateStores>
        <ToastProvider />
        <StoreHeader />
        {children}

      </RehydrateStores>
    </QueryClientProvider>
  );
}
