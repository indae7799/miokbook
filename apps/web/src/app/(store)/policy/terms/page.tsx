import type { Metadata } from 'next';
import { readPolicyDocument } from '@/lib/policy-documents';
import PolicyRenderer from '@/components/policy/PolicyRenderer';

export const metadata: Metadata = {
  title: '이용약관',
  description: '미옥서원 이용약관',
};

export default async function TermsPage() {
  const content = await readPolicyDocument('terms');

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">이용약관</h1>
      <PolicyRenderer content={content} />
    </>
  );
}
