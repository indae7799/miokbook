'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function FindAccountPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('해당 이메일로 가입된 계정을 찾을 수 없습니다.');
      } else {
        setError('비밀번호 재설정 이메일 전송에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-[450px]">
        <div className="mb-8 flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/login">
              <ArrowLeft className="size-5 text-gray-400" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-gray-900">아이디/비밀번호 찾기</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {!success ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">비밀번호 재설정</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  가입하신 이메일 주소를 입력해 주세요. <br />
                  비밀번호를 재설정할 수 있는 링크를 보내드립니다.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-600">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold text-gray-500 uppercase">이메일 주소</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="pl-10 h-12 rounded-xl focus:ring-green-500"
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !email}
                  className="w-full h-12 bg-green-700 hover:bg-green-800 font-bold rounded-xl"
                >
                  {loading ? '전송 중...' : '비밀번호 재설정 메일 보내기'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="text-center py-4 space-y-6 animate-in fade-in zoom-in-95">
              <div className="size-16 bg-green-50 rounded-full flex items-center justify-center text-green-700 mx-auto">
                <CheckCircle2 className="size-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">메일이 전송되었습니다</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  <span className="font-bold text-gray-800">{email}</span> 주소로 <br />
                  비밀번호 재설정 안내 메일을 보내드렸습니다. <br />
                  메일함(스팸함 포함)을 확인해 주세요.
                </p>
              </div>
              <Button asChild className="w-full h-12 bg-gray-900 rounded-xl">
                <Link href="/login">로그인 화면으로 돌아가기</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="mt-8 p-6 bg-gray-100/50 rounded-2xl border border-dashed border-gray-200">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">도움이 필요하신가요?</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            이메일이 기억나지 않거나 본인인증이 불가능한 경우 <br />
            고객센터(1588-1234) 또는 1:1 문의를 이용해 주세요.
          </p>
        </div>
      </div>
    </main>
  );
}
