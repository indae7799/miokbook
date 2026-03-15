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
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
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
