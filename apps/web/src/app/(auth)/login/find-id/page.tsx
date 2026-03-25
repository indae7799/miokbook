'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function FindIdPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length < 10) {
      setError('올바른 휴대폰 번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/auth/find-id?phone=${encodeURIComponent(normalized)}`);
      const data = await res.json();
      if (res.ok && data.email) {
        setResult(data.email);
      } else {
        setError('해당 번호로 가입된 계정을 찾을 수 없습니다.');
      }
    } catch {
      setError('오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf8f4] flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-[420px]">
        <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#9c7c65] hover:text-[#722f37]">
          <ArrowLeft className="size-4" />
          로그인으로 돌아가기
        </Link>

        <div className="overflow-hidden rounded-2xl border border-[#e8e0d6] bg-white shadow-sm">
          <div className="border-b border-[#f0ebe3] px-7 py-5">
            <h1 className="text-lg font-bold text-[#1e1612]">아이디 찾기</h1>
            <p className="mt-1 text-sm text-[#9c7c65]">가입 시 등록한 휴대폰 번호로 이메일을 찾습니다.</p>
          </div>
          <div className="p-7">
            {result ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">이메일을 찾았습니다</p>
                    <p className="mt-1 text-sm text-emerald-700 font-mono">{result}</p>
                  </div>
                </div>
                <Button asChild className="h-12 w-full rounded-xl bg-[#722f37] text-sm font-bold text-white hover:bg-[#5f2430]">
                  <Link href="/login">로그인하러 가기</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-[#9c7c65]">휴대폰 번호</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#c4b8ae]" />
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="숫자만 입력해 주세요"
                      className="h-12 rounded-xl border-[#e0d5c8] bg-[#fdf9f4] pl-10 focus:border-[#722f37] focus:ring-2 focus:ring-[#722f37]/10"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, '').length < 10}
                  className="h-12 w-full rounded-xl bg-[#722f37] text-sm font-bold text-white shadow-sm hover:bg-[#5f2430] disabled:opacity-40"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      조회 중...
                    </span>
                  ) : '아이디 찾기'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
