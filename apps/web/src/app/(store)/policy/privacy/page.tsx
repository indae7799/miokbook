import type { Metadata } from 'next';
import { readPolicyDocument } from '@/lib/policy-documents';
import PolicyRenderer from '@/components/policy/PolicyRenderer';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '미옥서원 개인정보처리방침',
};

export default async function PrivacyPage() {
  const content = await readPolicyDocument('privacy');

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">개인정보처리방침</h1>
      <PolicyRenderer content={content} />
    </>
  );
}
