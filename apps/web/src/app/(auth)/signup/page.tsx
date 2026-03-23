'use client';

import { useState } from 'react';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Image from 'next/image';
import { auth, isFirebaseConfigured } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다.')
  .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, '영문과 숫자를 모두 포함해 주세요.');

const signupSchema = z
  .object({
    name: z.string().min(1, '이름을 입력해 주세요.'),
    email: z.string().email('올바른 이메일을 입력해 주세요.'),
    password: passwordSchema,
    passwordConfirm: z.string(),
    phone: z.string().min(1, '전화번호를 입력해 주세요.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

async function syncProfile(payload: { displayName?: string; phone?: string; email?: string }) {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('AUTH_TOKEN_MISSING');

  const res = await fetch('/api/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('PROFILE_SYNC_FAILED');
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = signupSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!auth) throw new Error('Firebase not initialized');
      const cred = await createUserWithEmailAndPassword(auth, result.data.email, result.data.password);
      await updateProfile(cred.user, { displayName: result.data.name });
      await syncProfile({
        displayName: result.data.name,
        phone: result.data.phone,
        email: result.data.email,
      });
      router.push('/');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        setError('이미 등록된 이메일입니다.');
      } else {
        setError('회원가입에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!auth) return;

    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;
      await syncProfile({
        displayName: user.displayName ?? '',
        phone: '',
        email: user.email ?? '',
      });
      router.push('/');
    } catch {
      setError('Google 회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/logo.png"
              alt="미옥서원"
              width={160}
              height={48}
              className="h-12 w-auto object-contain mx-auto"
              style={{ width: 'auto' }}
            />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          <p className="text-sm text-gray-500 mt-2 text-balance leading-relaxed">
            책을 발견하는 즐거움과 공간, 미옥서원에 오신 것을 환영합니다.
            <br />
            이메일 또는 Google로 간편하게 가입해 보세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              이름
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="홍길동"
              className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
              className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="8자 이상, 영문+숫자 포함"
              className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력해 주세요"
              className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              전화번호
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={handleChange}
              placeholder="01012345678"
              className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        {isFirebaseConfigured && (
          <>
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">또는</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full h-11 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google로 회원가입
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          이미 회원이신가요?{' '}
          <Link href="/login" className="text-green-700 font-medium hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
