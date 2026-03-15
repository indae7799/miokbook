'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ToastProvider from '@/components/common/ToastProvider';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30 * 1000, retry: 1 },
    },
  });
}

let adminQueryClient: QueryClient | undefined;
function getAdminQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!adminQueryClient) adminQueryClient = makeQueryClient();
  return adminQueryClient;
}

const navItems = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/books', label: '도서 관리' },
  { href: '/admin/orders', label: '주문 관리' },
  { href: '/admin/cms', label: 'CMS' },
  { href: '/admin/marketing', label: '배너/팝업' },
] as const;

export default function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const [queryClient] = useState(getAdminQueryClient);
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuthStore();
  useAdminGuard();

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider />
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-border bg-card p-4">
        <h2 className="text-lg font-semibold mb-6 px-2">관리자</h2>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`min-h-[48px] flex items-center px-4 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-6 bg-background">{children}</main>
    </div>
    </QueryClientProvider>
  );
}
