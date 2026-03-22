import type { Metadata } from 'next';
import { readPolicyDocument } from '@/lib/policy-documents';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '미옥서원 개인정보처리방침',
};

export default async function PrivacyPage() {
  const content = await readPolicyDocument('privacy');

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">개인정보처리방침</h1>
      <pre className="mt-6 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
        {content}
      </pre>
    </>
  );
}
