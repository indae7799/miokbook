'use client';

import { useEffect } from 'react';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[store error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6">
      <EmptyState
        title="일시적인 오류"
        message="페이지를 불러오는 중 문제가 생겼습니다. Firebase/환경 설정을 확인하거나 잠시 후 다시 시도해 주세요."
        actionButton={{
          label: '다시 시도',
          onClick: () => reset(),
        }}
      />
      <Button variant="outline" asChild>
        <Link href="/">홈으로</Link>
      </Button>
    </div>
  );
}
