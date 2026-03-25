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
}

export default function EventCard({ event, priority, imageUrlOverride }: EventCardProps) {
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
      <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md">
        <Link href={`/events/${event.eventId}`} className="relative block aspect-[4/5] w-full overflow-hidden bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={event.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              {...(priority ? { priority: true } : {})}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f3f0eb] text-xs text-muted-foreground">
              No Image
            </div>
          )}

          <div className="absolute left-3 top-3">
            <span className="rounded-md border border-primary/20 bg-white/90 px-2 py-1 text-[10px] font-bold text-primary shadow-sm backdrop-blur-sm">
              {typeLabel}
            </span>
          </div>
        </Link>

        <div className="flex flex-1 flex-col justify-between p-4 pb-[19px]">
          <div>
            <Link href={`/events/${event.eventId}`} className="line-clamp-2 text-base font-bold leading-snug transition-colors hover:text-primary">
              {event.title}
            </Link>
            {dateStr ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-primary/40" />
                {dateStr}
              </p>
            ) : null}
            {event.description ? (
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {event.description}
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex gap-2">
            <Button asChild variant="outline" size="sm" className="h-10 flex-1 rounded-lg text-xs">
              <Link href={`/events/${event.eventId}`}>상세보기</Link>
            </Button>
            {buttonState === 'closed' ? (
              <Button
                size="sm"
                className="h-10 flex-1 rounded-lg text-xs font-semibold"
                disabled
              >
                {buttonLabel}
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="h-10 flex-1 rounded-lg text-xs font-semibold"
              >
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
