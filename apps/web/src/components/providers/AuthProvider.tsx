'use client';

import { useEffect, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/client';
import { useAuthStore } from '@/store/auth.store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setAdmin = useAuthStore((s) => s.setAdmin);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const token = await user.getIdTokenResult();
        setAdmin(token.claims.role === 'admin');
      } else {
        setAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setAdmin, setLoading]);

  return <>{children}</>;
}
