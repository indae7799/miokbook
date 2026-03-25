'use client';

import { Suspense, useState, useCallback } from 'react';
import { z } from 'zod';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle, Package, Mail, Lock, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해 주세요'),
  password: z.string().min(1, '비밀번호를 입력해 주세요'),
});

function KakaoIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.712 4.8 4.312 6.111l-.817 2.99c-.046.17.038.34.2.414.054.025.112.038.17.038.1 0 .2-.047.26-.13l3.58-2.392c.414.05.842.077 1.295.077 4.97 0 9-3.186 9-7.115S16.97 3 12 3z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';

  // 결제 페이지에서 넘어온 경우
  const isFromCheckout = redirect.startsWith('/checkout');

  const [activeTab, setActiveTab] = useState<'member' | 'non-member'>('member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [orderName, setOrderName] = useState('');
  const [orderId, setOrderId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (!auth) throw new Error('Auth not initialized');
      await signInWithEmailAndPassword(auth, result.data.email, result.data.password);
      router.push(redirect);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
          break;
        case 'auth/too-many-requests':
          setError('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');
          break;
        default:
          setError('로그인에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    sessionStorage.setItem('kakao_redirect', redirect);
    const redirectUri = `${window.location.origin}/api/auth/kakao/callback`;
    const kakaoAuthUrl =
      `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push(redirect);
    } catch {
      setError('Google 로그인에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf8f4] flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-[420px]">

        {/* 로고 */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex" aria-label="미옥서원 홈">
            <Image
              src="/logo.png"
              alt="미옥서원"
              width={148}
              height={48}
              className="h-[42px] w-auto object-contain sm:h-[48px]"
              style={{ width: 'auto' }}
              priority
            />
          </Link>
          <p className="mt-2 text-sm text-[#9c7c65]">함께 읽고 쓰고 나누는 공동체</p>
        </div>

        {/* 결제 컨텍스트 배너 */}
        {isFromCheckout && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#e8e0d6] bg-white px-4 py-3.5 shadow-sm">
            <ShoppingBag className="mt-0.5 size-5 shrink-0 text-[#2C0D1A]" />
            <div>
              <p className="text-sm font-semibold text-[#1e1612]">구매를 위해 로그인이 필요합니다</p>
              <p className="mt-0.5 text-xs text-[#9c7c65]">로그인 후 결제 페이지로 자동으로 이동됩니다.</p>
            </div>
          </div>
        )}

        {/* 카드 */}
        <div className="overflow-hidden rounded-2xl border border-[#e8e0d6] bg-white shadow-sm">

          {/* 탭 */}
          <div className="grid grid-cols-2 border-b border-[#f0ebe3]">
            {(['member', 'non-member'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setError(''); }}
                className={`py-4 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'border-b-2 border-[#2C0D1A] bg-white text-[#2C0D1A]'
                    : 'bg-[#fdf9f4] text-[#b39982] hover:text-[#6b5448]'
                }`}
              >
                {tab === 'member' ? '회원 로그인' : '비회원 주문조회'}
              </button>
            ))}
          </div>

          <div className="p-7">
            {activeTab === 'member' ? (
              <div className="space-y-5">

                {/* 에러 */}
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-[#9c7c65]">이메일</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#c4b8ae]" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="h-12 rounded-xl border-[#e0d5c8] bg-[#fdf9f4] pl-10 focus:border-[#2C0D1A] focus:ring-2 focus:ring-[#4A1728]/12"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold text-[#9c7c65]">비밀번호</Label>
                      <div className="flex items-center gap-2 text-xs text-[#b39982]">
                        <Link href="/login/find-id" className="transition-colors hover:text-[#2C0D1A]">아이디 찾기</Link>
                        <span className="text-[#e0d5c8]">|</span>
                        <Link href="/login/find-account" className="transition-colors hover:text-[#2C0D1A]">비밀번호 찾기</Link>
                      </div>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#c4b8ae]" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호를 입력해 주세요"
                        className="h-12 rounded-xl border-[#e0d5c8] bg-[#fdf9f4] pl-10 pr-11 focus:border-[#2C0D1A] focus:ring-2 focus:ring-[#4A1728]/12"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#c4b8ae] transition-colors hover:text-[#9c7c65]"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="size-4 cursor-pointer rounded border-[#e0d5c8] accent-[#2C0D1A]"
                    />
                    <Label htmlFor="remember" className="cursor-pointer select-none text-xs text-[#9c7c65]">
                      이메일 저장
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-xl bg-[#2C0D1A] text-sm font-bold text-white shadow-sm transition-all hover:bg-[#4A1728]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        로그인 중...
                      </span>
                    ) : '로그인'}
                  </Button>
                </form>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#f0ebe3]" />
                  <span className="text-[11px] font-medium text-[#c4b8ae]">간편 로그인</span>
                  <div className="h-px flex-1 bg-[#f0ebe3]" />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleKakaoLogin}
                    disabled={loading}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-sm font-semibold text-[#3A1D1D] transition-all hover:bg-[#F5DC00] active:scale-[0.98] disabled:opacity-50"
                  >
                    <KakaoIcon />
                    카카오
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e0d5c8] bg-white text-sm font-semibold text-[#4a3728] transition-all hover:bg-[#fdf9f4] active:scale-[0.98] disabled:opacity-50"
                  >
                    <GoogleIcon />
                    Google
                  </button>
                </div>

                <div className="border-t border-[#f0ebe3] pt-4 text-center">
                  <p className="text-xs text-[#b39982]">
                    회원가입 없이 구매하시겠어요?{' '}
                    <button
                      type="button"
                      className="font-semibold text-[#2C0D1A] hover:text-[#4A1728] hover:underline underline-offset-2"
                      onClick={() => {
                        const dest = isFromCheckout ? redirect : '/checkout';
                        const params = new URLSearchParams(dest.includes('?') ? dest.split('?')[1] : '');
                        const isbn = params.get('isbn');
                        const qty = Math.max(1, Math.min(10, Number(params.get('qty') ?? '1') || 1));
                        if (isbn) {
                          useCartStore.getState().setDirectPurchase(isbn, qty);
                        }
                        router.push(dest);
                      }}
                    >
                      비회원 주문하기
                    </button>
                  </p>
                </div>
              </div>

            ) : (
              /* 비회원 주문조회 */
              <div className="space-y-5">
                <div className="flex gap-3 rounded-xl border border-[#e8e0d6] bg-[#fdf9f4] p-4">
                  <Package className="mt-0.5 size-5 shrink-0 text-[#9c7c65]" />
                  <p className="text-sm leading-relaxed text-[#6b5448]">
                    주문번호와 주문자명으로 배송 현황을 확인할 수 있습니다.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="orderName" className="text-xs font-semibold text-[#9c7c65]">주문자명</Label>
                    <Input
                      id="orderName"
                      value={orderName}
                      onChange={(e) => setOrderName(e.target.value)}
                      placeholder="주문 시 입력한 이름"
                      className="h-12 rounded-xl border-[#e0d5c8] bg-[#fdf9f4] focus:border-[#2C0D1A] focus:ring-2 focus:ring-[#4A1728]/12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="orderId" className="text-xs font-semibold text-[#9c7c65]">주문번호</Label>
                    <Input
                      id="orderId"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="예: 20240319xxxxxxxx"
                      className="h-12 rounded-xl border-[#e0d5c8] bg-[#fdf9f4] focus:border-[#2C0D1A] focus:ring-2 focus:ring-[#4A1728]/12"
                    />
                  </div>
                  <Button
                    disabled={!orderName.trim() || !orderId.trim()}
                    onClick={() => router.push(`/guest-order?orderId=${orderId}&orderName=${encodeURIComponent(orderName)}`)}
                    className="h-12 w-full rounded-xl bg-[#2e251f] text-sm font-bold text-white hover:bg-[#1e1612] disabled:opacity-40"
                  >
                    주문 내역 조회하기
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 회원가입 유도 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#9c7c65]">
            아직 회원이 아니신가요?{' '}
            <Link href="/signup" className="font-bold text-[#2C0D1A] transition-colors hover:text-[#4A1728]">
              회원가입
            </Link>
          </p>
        </div>

        {/* 푸터 */}
        <div className="mt-8 space-y-1.5 text-center text-[11px] text-[#c4b8ae]">
          <p>&copy; {new Date().getFullYear()} 온라인 서점 미옥서원. All rights reserved.</p>
          <div className="flex justify-center gap-3">
            <Link href="/policy/terms" className="transition-colors hover:text-[#9c7c65]">이용약관</Link>
            <span>·</span>
            <Link href="/policy/privacy" className="transition-colors hover:text-[#9c7c65]">개인정보처리방침</Link>
            <span>·</span>
            <Link href="/policy/youth" className="transition-colors hover:text-[#9c7c65]">청소년보호정책</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#faf8f4]">
        <div className="size-8 animate-spin rounded-full border-2 border-[#e8e0d6] border-t-[#2C0D1A]" />
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
