import { getEventsList, type EventType } from '@/lib/events';
import EventCard from '@/components/events/EventCard';
import type { EventCardEvent } from '@/components/events/EventCard';
import Link from 'next/link';
import { Mic2 } from 'lucide-react';

/** 이벤트 목록: 개발 5분 / 프로덕션 10분 캐싱 */
export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 600;

const TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'author_talk', label: '공연' },
  { value: 'book_club', label: '독서모임' },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const typeFilter = (type === 'book_concert' || type === 'author_talk' || type === 'book_club' ? type : '') as EventType;
  let list: EventCardEvent[] = [];
  try {
    const events = await getEventsList(typeFilter);
    list = events.map((e) => ({
      eventId: e.eventId,
      title: e.title,
      type: e.type,
      description: e.description,
      imageUrl: e.imageUrl,
      date: e.date,
      location: e.location,
      capacity: e.capacity,
      registeredCount: e.registeredCount,
    }));
  } catch {
    // 500 방지
  }

  return (
    <main className="min-h-screen py-6 mx-auto max-w-[1400px] px-4 sm:px-6">
      <h1 className="text-2xl font-semibold mb-4">이벤트</h1>
      <nav className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/concerts"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80"
        >
          <Mic2 className="size-3.5" />
          북콘서트
        </Link>
        {TYPE_OPTIONS.map((opt) => (
          <Link
            key={opt.value || 'all'}
            href={opt.value ? `/events?type=${opt.value}` : '/events'}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              typeFilter === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">등록된 이벤트가 없습니다.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((event) => (
            <EventCard key={event.eventId} event={event} />
          ))}
        </div>
      )}
    </main>
  );
}
