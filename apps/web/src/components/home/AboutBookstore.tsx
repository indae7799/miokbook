import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface AboutBookstoreProps {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function AboutBookstore({
  title = '온라인 독립서점',
  description = '책을 발견하는 공간. 독립서점의 경험을 온라인으로.',
  ctaLabel = '도서 보기',
  ctaHref = '/books',
}: AboutBookstoreProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button asChild className="min-h-[48px]">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </section>
  );
}
