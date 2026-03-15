'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { useCartStore } from '@/store/cart.store';
import ToastProvider from '@/components/common/ToastProvider';

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
  const rehydrate = (useCartStore as { persist?: { rehydrate?: () => void } }).persist?.rehydrate;
  useEffect(() => {
    rehydrate?.();
  }, [rehydrate]);
  return <>{children}</>;
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <RehydrateStores>
        <ToastProvider />
        {children}
      </RehydrateStores>
    </QueryClientProvider>
  );
}
