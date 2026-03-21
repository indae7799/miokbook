'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface UseAdminGuardOptions {
  redirectNonAdmin?: boolean;
}

export function useAdminGuard(options: UseAdminGuardOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuthStore();
  const { redirectNonAdmin = true } = options;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${redirect}`);
      return;
    }
    if (!isAdmin && redirectNonAdmin) {
      router.replace('/');
    }
  }, [user, isAdmin, loading, pathname, redirectNonAdmin, router]);
}

export default useAdminGuard;
