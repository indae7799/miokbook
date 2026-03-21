'use client';

import { useEffect, useRef } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function KakaoCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const token = searchParams.get('token');
    if (!token || !auth) {
      router.replace('/login?error=kakao_failed');
      return;
    }

    signInWithCustomToken(auth, token)
      .then(() => {
        // redirect 파라미터 있으면 그쪽으로, 없으면 홈
        const redirect = sessionStorage.getItem('kakao_redirect') ?? '/';
        sessionStorage.removeItem('kakao_redirect');
        router.replace(redirect);
      })
      .catch((e) => {
        console.error('[kakao-complete] signInWithCustomToken 실패:', e);
        router.replace('/login?error=kakao_failed');
      });
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
      <div className="size-10 border-[3px] border-yellow-200 border-t-yellow-400 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">카카오 로그인 처리 중...</p>
    </main>
  );
}

export default function KakaoCompletePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="size-10 border-[3px] border-yellow-200 border-t-yellow-400 rounded-full animate-spin" />
      </main>
    }>
      <KakaoCompleteContent />
    </Suspense>
  );
}
