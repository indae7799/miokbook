'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export function useAdminGuard() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) router.replace('/');
  }, [user, isAdmin, loading, router]);
}

export default useAdminGuard;
