'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import EventRegistrationForm from './EventRegistrationForm';
import { getEventButtonState } from '@/lib/event-date';
import { getEventTypeLabel } from '@/lib/eventLabels';

const NAVER_PLACE_URL = 'https://naver.me/53lKvYM7';

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export interface EventCardEvent {
  eventId: string;
  title: string;
  type: string;
  description?: string;
  imageUrl: string;
  date: string;
  location?: string;
  capacity: number;
  registeredCount: number;
}

export interface EventCardProps {
  event: EventCardEvent;
  priority?: boolean;
  imageUrlOverride?: string;
  showBadges?: boolean;
}

export default function EventCard({ event, priority, imageUrlOverride, showBadges = false }: EventCardProps) {
  const [showRegForm, setShowRegForm] = useState(false);

  const dateStr = formatEventDate(event.date);
  const typeLabel = getEventTypeLabel(event.type);
  const imageUrl = imageUrlOverride?.trim() || event.imageUrl?.trim();
  const buttonState = getEventButtonState(event.date);

  const buttonLabel =
    buttonState === 'closed' ? '종료' :
    buttonState === 'open_soon' ? '오픈예정' :
    '신청하기';

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
        <Link href={`/events/${event.eventId}`} className="relative block aspect-[4/5] w-full overflow-hidden bg-[#f3f0eb]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={event.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
              className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
              {...(priority ? { priority: true } : {})}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f3f0eb] text-xs text-muted-foreground">
              No Image
            </div>
          )}

          {showBadges ? (
            <div className="absolute left-3 top-3">
              {buttonState === 'open' ? (
                <span className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white shadow-md">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-200 opacity-90" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  예약중
                </span>
              ) : buttonState === 'open_soon' ? (
                <span className="rounded-md bg-amber-400 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                  오픈예정
                </span>
              ) : null}
            </div>
          ) : null}
        </Link>

        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <Link href={`/events/${event.eventId}`} className="line-clamp-2 text-base font-bold leading-snug transition-colors hover:text-primary">
              {event.title}
            </Link>
            {dateStr ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                {dateStr}
              </p>
            ) : null}
            {event.description ? (
              <p className="mt-2.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {event.description}
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex gap-2">
            <Button asChild variant="outline" size="sm" className="h-10 flex-1 rounded-xl text-xs">
              <Link href={`/events/${event.eventId}`}>상세보기</Link>
            </Button>
            {buttonState === 'closed' ? (
              <Button size="sm" className="h-10 flex-1 rounded-xl text-xs font-semibold" disabled>
                종료
              </Button>
            ) : (
              <Button asChild size="sm" className="h-10 flex-1 rounded-xl text-xs font-semibold">
                <a href={NAVER_PLACE_URL} target="_blank" rel="noopener noreferrer">
                  {buttonLabel}
                </a>
              </Button>
            )}
          </div>
        </div>
      </article>

      {showRegForm ? (
        <EventRegistrationForm
          eventId={event.eventId}
          eventTitle={event.title}
          isOpen={showRegForm}
          onClose={() => setShowRegForm(false)}
          onSuccess={() => setShowRegForm(false)}
        />
      ) : null}
    </>
  );
}
