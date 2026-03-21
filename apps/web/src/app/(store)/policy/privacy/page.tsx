import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '미옥서원 개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">개인정보처리방침</h1>
      <p className="mt-4 text-sm leading-relaxed text-gray-600">
        개인정보처리방침 전문은 정비 중입니다. 문의는 서점 운영 채널로 부탁드립니다.
      </p>
      <p className="mt-6">
        <Link href="/" className="text-sm text-amber-900 underline underline-offset-4 hover:text-amber-800">
          홈으로
        </Link>
      </p>
    </>
  );
}
