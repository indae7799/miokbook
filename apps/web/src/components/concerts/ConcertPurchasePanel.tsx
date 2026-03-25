'use client';

import { CalendarDays, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isEventClosed } from '@/lib/event-date';

interface Props {
  concertId: string;
  concertTitle: string;
  feeLabel: string;
  feeNote: string;
  hostNote: string;
  statusBadge: string;
  ticketPrice: number;
  ticketOpen: boolean;
  mapUrl: string;
  concertDate?: string | null;
  className?: string;
  showReserveButton?: boolean;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '일정 추후 공개';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '일정 추후 공개';
  return value.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ConcertPurchasePanel({
  concertId: _concertId,
  concertTitle: _concertTitle,
  feeLabel,
  feeNote,
  hostNote,
  statusBadge,
  ticketPrice,
  ticketOpen,
  mapUrl,
  concertDate,
  className = '',
  showReserveButton = true,
}: Props) {
  const displayPrice = feeLabel || formatPrice(ticketPrice);
  const isClosed = isEventClosed(concertDate ?? '');
  const canReserve = Boolean(!isClosed && ticketOpen && mapUrl);

  const handleReserve = () => {
    if (!canReserve) return;
    window.location.href = mapUrl;
  };

  return (
    <aside className={`flex h-full flex-col border border-[#722f37]/18 bg-white p-5 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3 border-b border-[#722f37]/10 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#722f37]">Reservation</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-[#201714] [text-wrap:balance]">참가 안내</h2>
        </div>
        {statusBadge ? (
          <span className="border border-[#722f37]/20 bg-[#f8f1f2] px-3 py-1 text-xs font-semibold text-[#722f37]">
            {statusBadge}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div className="space-y-3">
          <div className="border border-[#722f37]/10 bg-[#fcfaf8] p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[#5f4a42]">참가비</span>
              <span className="text-lg font-bold text-[#722f37]">{displayPrice}</span>
            </div>
          </div>

          <div className="border border-[#722f37]/10 bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-[#5f4a42]">
              <CalendarDays className="size-4 text-[#722f37]" />
              <span>{formatDate(concertDate)}</span>
            </div>
            <p className="mt-3 break-keep text-sm leading-6 text-[#5f4a42]">{feeNote || '현장 결제 가능합니다.'}</p>
            {hostNote ? <p className="mt-1 break-keep text-sm leading-6 text-[#5f4a42]">{hostNote}</p> : null}
          </div>
        </div>

        {showReserveButton && isClosed ? (
          <Button
            type="button"
            className="mt-auto inline-flex h-12 w-full items-center justify-center gap-1 whitespace-nowrap rounded-none bg-[#5f4a42]/30 px-0 text-center text-[#5f4a42] cursor-not-allowed"
            disabled
          >
            종료
          </Button>
        ) : showReserveButton && canReserve ? (
          <Button
            type="button"
            className="mt-auto inline-flex h-12 w-full items-center justify-center gap-1 whitespace-nowrap rounded-none bg-[#722f37] px-0 text-center text-white hover:bg-[#5e2730]"
            onClick={handleReserve}
          >
            <MapPin className="size-4 shrink-0" />
            신청하기
          </Button>
        ) : showReserveButton ? (
          <div className="mt-auto flex h-12 items-center justify-center border border-dashed border-[#722f37]/16 px-4 text-center text-sm text-[#5f4a42]">
            예약 링크를 준비 중입니다.
          </div>
        ) : null}
      </div>
    </aside>
  );
}
