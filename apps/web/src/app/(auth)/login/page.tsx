'use client';

import { Suspense, useState } from 'react';
import { z } from 'zod';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle, Package, Mail, Lock } from 'lucide-react';

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
    <main className="min-h-screen bg-gradient-to-b from-green-50/60 to-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-[420px]">

        {/* 로고 */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block group">
            <h1 className="text-3xl font-bold text-green-800 tracking-tight group-hover:text-green-700 transition-colors">
              미옥서원
            </h1>
          </Link>
          <p className="text-gray-400 text-sm mt-1.5">함께 읽고 쓰고 나누는 공동체</p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 overflow-hidden">

          {/* 탭 */}
          <div className="grid grid-cols-2 border-b border-gray-100">
            {(['member', 'non-member'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setError(''); }}
                className={`py-4 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'text-green-700 border-b-2 border-green-600 bg-white'
                    : 'text-gray-400 bg-gray-50/60 hover:text-gray-600'
                }`}
              >
                {tab === 'member' ? '회원 로그인' : '비회원 주문조회'}
              </button>
            ))}
          </div>

          <div className="p-7">
            {activeTab === 'member' ? (
              <div className="space-y-5">

                {/* 에러 메시지 */}
                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 이메일 */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-gray-500">
                      이메일
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="pl-10 h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 bg-gray-50/50"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {/* 비밀번호 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold text-gray-500">
                        비밀번호
                      </Label>
                      <Link
                        href="/login/find-account"
                        className="text-xs text-gray-400 hover:text-green-700 transition-colors"
                      >
                        비밀번호 찾기
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호를 입력해 주세요"
                        className="pl-10 pr-11 h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 bg-gray-50/50"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 아이디 저장 */}
                  <div className="flex items-center gap-2">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="size-4 rounded border-gray-300 text-green-700 focus:ring-green-500 cursor-pointer accent-green-700"
                    />
                    <Label htmlFor="remember" className="text-xs text-gray-400 cursor-pointer select-none">
                      이메일 저장
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 text-sm font-bold bg-green-700 hover:bg-green-800 text-white rounded-xl shadow-sm shadow-green-900/10 transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        로그인 중...
                      </span>
                    ) : '로그인'}
                  </Button>
                </form>

                {/* 구분선 */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] text-gray-300 font-medium">간편 로그인</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* 소셜 로그인 */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleKakaoLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 h-11 bg-[#FEE500] hover:bg-[#F5DC00] text-[#3A1D1D] font-semibold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <KakaoIcon />
                    카카오
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 h-11 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <GoogleIcon />
                    Google
                  </button>
                </div>
              </div>

            ) : (
              /* 비회원 주문조회 */
              <div className="space-y-5">
                <div className="flex gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <Package className="size-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700 leading-relaxed">
                    주문번호와 주문자명으로 배송 현황을 확인할 수 있습니다.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="orderName" className="text-xs font-semibold text-gray-500">주문자명</Label>
                    <Input
                      id="orderName"
                      value={orderName}
                      onChange={(e) => setOrderName(e.target.value)}
                      placeholder="주문 시 입력한 이름"
                      className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="orderId" className="text-xs font-semibold text-gray-500">주문번호</Label>
                    <Input
                      id="orderId"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="예: 20240319xxxxxxxx"
                      className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
                    />
                  </div>
                  <Button
                    disabled={!orderName.trim() || !orderId.trim()}
                    onClick={() => router.push(`/guest-order?id=${orderId}&name=${encodeURIComponent(orderName)}`)}
                    className="w-full h-12 font-bold rounded-xl bg-gray-900 hover:bg-black text-white text-sm disabled:opacity-40"
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
          <p className="text-sm text-gray-400">
            아직 회원이 아니신가요?{' '}
            <Link href="/signup" className="font-bold text-green-700 hover:text-green-800 transition-colors">
              회원가입
            </Link>
          </p>
        </div>

        {/* 푸터 */}
        <div className="mt-8 text-center text-[11px] text-gray-300 space-y-1.5">
          <p>&copy; {new Date().getFullYear()} 온라인 서점 미옥서원. All rights reserved.</p>
          <div className="flex justify-center gap-3">
            <Link href="/policy/terms" className="hover:text-gray-500 transition-colors">이용약관</Link>
            <span>·</span>
            <Link href="/policy/privacy" className="hover:text-gray-500 transition-colors">개인정보처리방침</Link>
            <span>·</span>
            <Link href="/policy/youth" className="hover:text-gray-500 transition-colors">청소년보호정책</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="size-8 border-3 border-green-200 border-t-green-700 rounded-full animate-spin" />
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
