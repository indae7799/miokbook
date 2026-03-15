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
    <main className="min-h-screen py-10 flex flex-col items-center justify-center px-4">
      <h1 className="text-xl font-semibold text-destructive mb-2">결제에 실패했습니다</h1>
      {message && <p className="text-muted-foreground text-sm mb-4">{decodeURIComponent(message)}</p>}
      {code && <p className="text-muted-foreground text-xs mb-4">코드: {code}</p>}
      {orderId && <p className="text-muted-foreground text-xs mb-6">주문번호: {orderId}</p>}
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
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">로딩 중…</div></main>}>
      <CheckoutFailContent />
    </Suspense>
  );
}
