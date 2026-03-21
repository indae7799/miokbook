'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { memo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ToastProvider from '@/components/common/ToastProvider';
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Layers,
  Megaphone,
  CalendarDays,
  Mic2,
  FileText,
  Youtube,
  LogOut,
  ChevronRight,
  Users,
  BarChart2,
  Package,
  Settings,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 60 * 1000,  // 30분 — 기본값. 페이지 재방문 시 Firestore 재조회 안 함
        gcTime:    60 * 60 * 1000,  // 1시간 — 메모리 캐시 유지
        retry: 1,
        refetchOnWindowFocus: false, // 다른 탭 갔다 와도 재요청 없음
        refetchOnMount: false,       // 캐시 있으면 재마운트 시 재요청 안 함
        refetchOnReconnect: false,   // 네트워크 재연결 시 재요청 없음
      },
    },
  });
}

let adminQueryClient: QueryClient | undefined;
function getAdminQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!adminQueryClient) adminQueryClient = makeQueryClient();
  return adminQueryClient;
}

import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: '운영',
    items: [
      { href: '/admin',               label: '대시보드',      icon: LayoutDashboard },
      { href: '/admin/orders',        label: '주문 관리',     icon: ShoppingCart },
      { href: '/admin/bulk-orders',   label: '대량구매 관리', icon: Package },
      { href: '/admin/customers',     label: '고객 관리',     icon: Users },
      { href: '/admin/analytics',     label: '매출 분석',     icon: BarChart2 },
    ],
  },
  {
    label: '도서',
    items: [
      { href: '/admin/books', label: '도서 관리', icon: BookOpen },
    ],
  },
  {
    label: '콘텐츠',
    items: [
      { href: '/admin/cms',       label: 'CMS 큐레이션', icon: Layers },
      { href: '/admin/marketing', label: '배너/팝업',    icon: Megaphone },
      { href: '/admin/events',    label: '이벤트',       icon: CalendarDays },
      { href: '/admin/concerts',  label: '북콘서트',     icon: Mic2 },
      { href: '/admin/content',   label: '콘텐츠',       icon: FileText },
      { href: '/admin/youtube-content', label: '유튜브', icon: Youtube },
    ],
  },
  {
    label: '설정',
    items: [
      { href: '/admin/settings', label: '쇼핑몰 설정', icon: Settings },
    ],
  },
];

// 네비 체크용 flat 배열
const navItems: NavItem[] = navGroups.flatMap(g => g.items);

const Sidebar = memo(function Sidebar({ pathname, userEmail }: { pathname: string; userEmail?: string | null }) {
  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    window.location.href = '/login';
  };

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-gray-100 bg-white">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-green-700 flex items-center justify-center">
            <BookOpen className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">미옥서원</p>
            <p className="text-[10px] text-gray-400">관리자 콘솔</p>
          </div>
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-300">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch
                    scroll={false}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-green-700 text-white shadow-sm shadow-green-900/10'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight className="size-3.5 text-white/70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 하단 유저 정보 */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3 space-y-1">
        {userEmail && (
          <div className="px-3 py-2">
            <p className="text-[11px] text-gray-400 truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <LogOut className="size-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
});

/** 어드민 진입 후 브라우저 유휴 시각에 다른 메뉴 JS를 미리 받아 두어 탭 전환 체감 개선 */
function AdminNavPrefetch() {
  const router = useRouter();
  useEffect(() => {
    const prefetchAll = () => {
      for (const { href } of navItems) {
        try {
          router.prefetch(href);
        } catch {
          /* noop */
        }
      }
    };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(prefetchAll, { timeout: 3500 });
    } else {
      timeoutId = setTimeout(prefetchAll, 400);
    }
    return () => {
      if (idleId != null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [router]);
  return null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getAdminQueryClient);
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const loading = useAuthStore((s) => s.loading);
  useAdminGuard({ redirectNonAdmin: false });

  if (loading) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider />
        <div className="min-h-screen flex bg-gray-50">
          <aside className="w-60 shrink-0 border-r border-gray-100 bg-white px-3 py-4 space-y-1">
            <div className="h-14 mb-4 mx-2 rounded-xl bg-gray-100 animate-pulse" />
            {navItems.map(({ href }) => (
              <div key={href} className="h-10 rounded-xl bg-gray-50 animate-pulse" />
            ))}
          </aside>
          <main className="flex-1 p-8 flex items-center gap-3 text-sm text-gray-400">
            <div className="size-5 border-2 border-green-200 border-t-green-700 rounded-full animate-spin" />
            권한 확인 중...
          </main>
        </div>
      </QueryClientProvider>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">로그인 페이지로 이동 중...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="size-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <LogOut className="size-6 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">관리자 권한이 필요합니다</h1>
          <p className="mt-2 text-sm text-gray-400 leading-relaxed">
            현재 계정에 <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">role: admin</code> 권한이 없습니다.
            Firebase Custom Claims 설정 후 다시 로그인해 주세요.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
            >
              홈으로 가기
            </Link>
            <Link
              href="/login?redirect=/admin"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              다른 계정으로 로그인
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider />
      <AdminNavPrefetch />
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar pathname={pathname} userEmail={user.email} />
        <div className="flex-1 flex flex-col min-w-0">
          {/* 상단 헤더 */}
          <header className="h-14 border-b border-gray-100 bg-white px-6 flex items-center justify-between shrink-0">
            <div className="text-sm text-gray-400">
              {navItems.find((n) => n.href === pathname || (n.href !== '/admin' && pathname.startsWith(n.href)))?.label ?? '관리자'}
            </div>
            <Link
              href="/"
              target="_blank"
              className="text-xs text-gray-400 hover:text-green-700 transition-colors"
            >
              스토어 보기 →
            </Link>
          </header>
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
