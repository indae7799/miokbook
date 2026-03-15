'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin error]', error);
  }, [error]);

  return (
    <div className="p-6">
      <p className="text-muted-foreground text-sm mb-4">관리자 페이지 로드 중 오류가 발생했습니다.</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>다시 시도</Button>
        <Button variant="outline" asChild>
          <Link href="/admin">대시보드로</Link>
        </Button>
      </div>
    </div>
  );
}
