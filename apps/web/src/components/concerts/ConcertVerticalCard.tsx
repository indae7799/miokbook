import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

export interface ConcertVerticalCardItem {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  date: string | null;
  statusBadge?: string;
  feeLabel?: string;
  description?: string;
}

function formatDate(date: string | null): string {
  if (!date) return '일정 추후 공개';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '일정 추후 공개';
  return value.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export interface ConcertVerticalCardProps {
  item: ConcertVerticalCardItem;
  variant?: 'default' | 'homeRail';
}

export default function ConcertVerticalCard({ item, variant = 'default' }: ConcertVerticalCardProps) {
  const detailHref = `/concerts/${item.slug}`;

  if (variant === 'homeRail') {
    return (
      <article className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <Link
          href={detailHref}
          className="flex h-full min-h-0 flex-col gap-3 p-3 pb-12 sm:gap-3 sm:p-4 sm:pb-12"
        >
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md bg-muted">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(max-width: 1024px) 100vw, 360px"
                className="object-contain object-center"
              />
            ) : null}
          </div>

          <div className="flex min-w-0 shrink-0 flex-col">
            <div className="flex flex-wrap items-center gap-1.5">
              {item.statusBadge ? (
                <span className="rounded-full border border-border bg-muted/80 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                  {item.statusBadge}
                </span>
              ) : null}
              {item.feeLabel ? (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {item.feeLabel}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">
              {formatDate(item.date)}
            </p>
            <h3 className="mt-2 line-clamp-3 font-myeongjo text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg">
              {item.title}
            </h3>
            {item.description ? (
              <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground sm:text-sm sm:line-clamp-5">
                {item.description}
              </p>
            ) : null}
          </div>
        </Link>
        <Link
          href={detailHref}
          className="absolute bottom-3 right-3 z-20 inline-flex items-center rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-md ring-1 ring-primary/15 transition-[opacity,transform] hover:opacity-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          자세히 보기
        </Link>
      </article>
    );
  }

  return (
    <article className="group h-full rounded-[28px] border border-[#2f241f]/8 bg-[#fdfaf5] p-3 shadow-[0_26px_70px_-54px_rgba(36,24,21,0.35)] transition-all hover:border-[#2f241f]/14 hover:shadow-[0_30px_80px_-52px_rgba(36,24,21,0.42)]">
      <Link href={detailHref} className="flex h-full flex-col">
        <div className="relative overflow-hidden rounded-[22px] border border-[#2f241f]/6 bg-[linear-gradient(180deg,#f0e7db_0%,#e7dac7_100%)]">
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-4 py-4">
            {item.statusBadge ? (
              <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#2f241f] shadow-[0_10px_22px_-18px_rgba(36,24,21,0.4)]">
                {item.statusBadge}
              </span>
            ) : (
              <span />
            )}
            {item.feeLabel ? (
              <span className="rounded-full border border-white/18 bg-[#2a201c]/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                {item.feeLabel}
              </span>
            ) : null}
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, 360px"
                className="object-contain object-center p-4 transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(13,10,9,0)_0%,rgba(13,10,9,0.28)_100%)]" />
          </div>
        </div>

        <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">
            {formatDate(item.date)}
          </p>
          <h3 className="mt-3 font-myeongjo text-[22px] font-bold leading-[1.28] tracking-tight text-[#201714]">
            {item.title}
          </h3>
          {item.description ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#62514a]">
              {item.description}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-end border-t border-[#2f241f]/8 pt-3">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-[#201714]">
              보기 <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
