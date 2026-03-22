import type { Metadata } from 'next';
import { readPolicyDocument } from '@/lib/policy-documents';

export const metadata: Metadata = {
  title: '이용약관',
  description: '미옥서원 이용약관',
};

export default async function TermsPage() {
  const content = await readPolicyDocument('terms');

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">이용약관</h1>
      <pre className="mt-6 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
        {content}
      </pre>
    </>
  );
}
