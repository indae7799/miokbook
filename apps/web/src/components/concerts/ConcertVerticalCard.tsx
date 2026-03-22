import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

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
  if (!date) return '';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return value.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ConcertVerticalCard({ item }: { item: ConcertVerticalCardItem }) {
  return (
    <article className="group overflow-hidden rounded-[26px] border border-[#2f241f]/8 bg-white shadow-[0_22px_70px_-48px_rgba(36,24,21,0.36)] transition-colors hover:border-[#2f241f]/14">
      <Link href={`/concerts/${item.slug}`} className="block">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[linear-gradient(180deg,#f4ede3_0%,#ede2d3_100%)]">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className="object-contain object-center p-3 transition-transform duration-500 group-hover:scale-[1.01] sm:p-4"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(14,10,9,0)_0%,rgba(14,10,9,0.34)_100%)] sm:h-28" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2 sm:left-4 sm:top-4">
            {item.statusBadge ? (
              <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#2f241f]">
                {item.statusBadge}
              </span>
            ) : null}
            {item.feeLabel ? (
              <span className="rounded-full border border-white/22 bg-black/24 px-3 py-1 text-[11px] font-medium text-white">
                {item.feeLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {item.date ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">{formatDate(item.date)}</p>
          ) : null}
          <h3 className="font-myeongjo text-[21px] font-bold leading-[1.3] tracking-tight text-[#201714] sm:text-[24px]">
            {item.title}
          </h3>
          {item.description ? (
            <p className="line-clamp-3 text-sm leading-6 text-[#62514a]">
              {item.description}
            </p>
          ) : null}
          <div className="inline-flex items-center gap-1 text-sm font-medium text-[#2f241f]">
            상세보기 <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </article>
  );
}
