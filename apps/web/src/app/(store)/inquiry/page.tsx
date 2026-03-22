'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'order', label: '주문/결제' },
  { value: 'delivery', label: '배송' },
  { value: 'return', label: '반품/교환' },
  { value: 'book', label: '도서 문의' },
  { value: 'event', label: '이벤트 문의' },
  { value: 'other', label: '기타' },
];

export default function InquiryPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();

  const [category, setCategory] = useState('other');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/inquiry');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="size-8 border-2 border-green-200 border-t-green-700 rounded-full animate-spin" />
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!subject.trim()) { setError('제목을 입력해 주세요.'); return; }
    if (!message.trim()) { setError('문의 내용을 입력해 주세요.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.displayName || '회원',
          email: user.email || '',
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen py-10">
        <div className="max-w-xl mx-auto text-center space-y-6 py-16 px-4">
          <div className="flex justify-center">
            <CheckCircle2 className="size-16 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">문의가 접수되었습니다</h1>
          <p className="text-gray-500 leading-relaxed">
            소중한 문의를 보내주셔서 감사합니다.<br />
            담당자가 확인 후 이메일로 답변 드리겠습니다.<br />
            (평일 10:00 ~ 18:00, 영업일 기준 1~2일 소요)
          </p>
          <Button asChild className="mt-4 bg-green-700 hover:bg-green-800 text-white rounded-xl h-12 px-8">
            <Link href="/">홈으로 돌아가기</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-6">
      <div className="max-w-xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" asChild className="-ml-2 mb-2">
            <Link href="/">
              <ChevronLeft className="size-4 mr-1" />
              홈으로
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">1:1 고객문의</h1>
          <p className="text-sm text-gray-400 mt-1">
            문의 내용은 <span className="text-green-700 font-medium">support.miokbook@gmail.com</span>으로 전달됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* 작성자 정보 (읽기 전용) */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-1">이름</p>
              <p className="text-sm font-medium text-gray-800">{user.displayName || '회원'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">이메일</p>
              <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
            </div>
          </div>

          {/* 문의 유형 */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">문의 유형</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    category === cat.value
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-sm font-semibold text-gray-700">
              제목 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="문의 제목을 입력해 주세요"
              className="h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/10"
              maxLength={100}
            />
          </div>

          {/* 내용 */}
          <div className="space-y-1.5">
            <Label htmlFor="message" className="text-sm font-semibold text-gray-700">
              문의 내용 <span className="text-red-400">*</span>
            </Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="문의 내용을 자세히 작성해 주세요. (주문번호, 도서명 등 관련 정보를 함께 작성해 주시면 더 빠르게 도움을 드릴 수 있습니다.)"
              rows={7}
              maxLength={2000}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none resize-none transition"
            />
            <p className="text-right text-xs text-gray-400">{message.length} / 2000</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-sm font-bold bg-green-700 hover:bg-green-800 text-white rounded-xl"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                전송 중...
              </span>
            ) : '문의 보내기'}
          </Button>

          <p className="text-center text-xs text-gray-400">
            평일 10:00 ~ 18:00 운영 · 영업일 기준 1~2일 내 답변
          </p>
        </form>
      </div>
    </main>
  );
}
