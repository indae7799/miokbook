'use client';

import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function MypageLayout({
  children,
}: { children: React.ReactNode }) {
  useAuthGuard();
  return <>{children}</>;
}
