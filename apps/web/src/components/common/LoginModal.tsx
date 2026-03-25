'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle, Mail, Lock, X } from 'lucide-react';
import Link from 'next/link';

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

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 로그인 성공 후 이동할 경로 */
  redirectAfterLogin?: string;
}

export default function LoginModal({ isOpen, onClose, redirectAfterLogin = '/' }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      if (!auth) throw new Error('Auth not initialized');
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
      router.push(redirectAfterLogin);
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
    sessionStorage.setItem('kakao_redirect', redirectAfterLogin);
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
      onClose();
      router.push(redirectAfterLogin);
    } catch {
      setError('Google 로그인에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* 모달 */}
      <div className="relative w-full max-w-[400px] rounded-2xl border border-gray-100 bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">로그인</h2>
            <p className="text-xs text-gray-400 mt-0.5">고객문의는 로그인 후 이용 가능합니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="modal-email" className="text-xs font-semibold text-gray-500">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                <Input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="pl-10 h-12 rounded-xl border-gray-200 focus:border-[#2C0D1A] focus:ring-2 focus:ring-[#4A1728]/12 bg-gray-50/50"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modal-password" className="text-xs font-semibold text-gray-500">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
                <Input
                  id="modal-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력해 주세요"
                  className="pl-10 pr-11 h-12 rounded-xl border-gray-200 focus:border-[#2C0D1A] focus:ring-2 focus:ring-[#4A1728]/12 bg-gray-50/50"
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#2C0D1A] text-sm font-bold text-white hover:bg-[#4A1728]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  로그인 중...
                </span>
              ) : '로그인'}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-300 font-medium">간편 로그인</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 bg-[#FEE500] hover:bg-[#F5DC00] text-[#3A1D1D] font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
            >
              <KakaoIcon />
              카카오
            </button>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
            >
              <GoogleIcon />
              Google
            </button>
          </div>

          <p className="text-center text-sm text-gray-400">
            아직 회원이 아니신가요?{' '}
            <Link
              href="/signup"
              onClick={onClose}
              className="font-bold text-[#2C0D1A] hover:text-[#4A1728] transition-colors"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
