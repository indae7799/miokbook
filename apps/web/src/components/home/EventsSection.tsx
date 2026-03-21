import Link from 'next/link';
import EventCard from '@/components/events/EventCard';
import type { EventCardEvent } from '@/components/events/EventCard';

export interface EventsSectionProps {
  events: EventCardEvent[];
  title?: string;
}

export default function EventsSection({ events, title = '이벤트' }: EventsSectionProps) {
  if (events.length === 0) return null;
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[28px] font-semibold">{title}</h2>
        <Link href="/events" className="text-sm text-primary hover:underline">
          전체 보기
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.slice(0, 3).map((event) => (
          <EventCard key={event.eventId} event={event} />
        ))}
      </div>
    </section>
  );
}
