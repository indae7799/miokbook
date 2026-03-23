'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function CheckoutFailContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const code = searchParams.get('code');
  const message = searchParams.get('message');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <h1 className="mb-2 text-xl font-semibold text-destructive">결제에 실패했습니다</h1>
      {message ? <p className="mb-4 text-sm text-muted-foreground">{decodeURIComponent(message)}</p> : null}
      {code ? <p className="mb-4 text-xs text-muted-foreground">코드: {code}</p> : null}
      {orderId ? <p className="mb-6 text-xs text-muted-foreground">주문번호: {orderId}</p> : null}
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/cart">장바구니로 이동</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/books">쇼핑 계속하기</Link>
        </Button>
      </div>
    </main>
  );
}

export default function CheckoutFailPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">로딩 중...</div></main>}>
      <CheckoutFailContent />
    </Suspense>
  );
}
