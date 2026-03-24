'use client';

import { useEffect, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/client';
import { useAuthStore } from '@/store/auth.store';

const ADMIN_CACHE_KEY = 'auth:isAdmin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setAdmin = useAuthStore((s) => s.setAdmin);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    if (auth.currentUser) {
      setUser(auth.currentUser);
      try {
        const cached = sessionStorage.getItem(`${ADMIN_CACHE_KEY}:${auth.currentUser.uid}`);
        if (cached != null) {
          setAdmin(cached === 'true');
          setLoading(false);
        }
      } catch {
        // ignore storage access errors
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const token = await Promise.race([
            user.getIdTokenResult(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('getIdTokenResult timeout')), 12_000),
            ),
          ]);
          const isAdmin = token.claims.role === 'admin';
          setAdmin(isAdmin);
          try {
            sessionStorage.setItem(`${ADMIN_CACHE_KEY}:${user.uid}`, String(isAdmin));
          } catch {
            // ignore storage access errors
          }
        } catch {
          // 타임아웃 또는 네트워크 오류 — 캐시된 값 사용
          try {
            const cached = sessionStorage.getItem(`${ADMIN_CACHE_KEY}:${user.uid}`);
            if (cached != null) setAdmin(cached === 'true');
          } catch {
            // ignore storage access errors
          }
        }
      } else {
        setAdmin(false);
        try {
          Object.keys(sessionStorage)
            .filter((key) => key.startsWith(`${ADMIN_CACHE_KEY}:`))
            .forEach((key) => sessionStorage.removeItem(key));
        } catch {
          // ignore storage access errors
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setAdmin, setLoading]);

  return <>{children}</>;
}
