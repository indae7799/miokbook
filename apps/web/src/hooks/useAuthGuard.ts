'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export function useAuthGuard() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const currentUrl =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '/';
      router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`);
    }
  }, [user, loading, router]);
}

export default useAuthGuard;
