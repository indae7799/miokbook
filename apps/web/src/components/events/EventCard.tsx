import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
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

const TYPE_LABEL: Record<string, string> = {
  book_concert: '북콘서트',
  author_talk: '저자강연',
  book_club: '독서모임',
};

export interface EventCardProps {
  event: EventCardEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const dateStr = formatEventDate(event.date);
  const typeLabel = TYPE_LABEL[event.type] ?? event.type;
  return (
    <article className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <Link href={`/events/${event.eventId}`} className="block relative aspect-video w-full bg-muted">
        <Image src={event.imageUrl} alt={event.title} fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover" />
      </Link>
      <div className="p-3 flex-1 flex flex-col">
        <span className="text-xs text-muted-foreground">{typeLabel}</span>
        <Link href={`/events/${event.eventId}`} className="font-medium text-sm mt-0.5 hover:underline line-clamp-2">
          {event.title}
        </Link>
        {dateStr && <p className="text-xs text-muted-foreground mt-1">{dateStr}</p>}
        <Button asChild className="mt-3 min-h-[48px] w-full" size="sm">
          <Link href={`/events/${event.eventId}`}>참여하기</Link>
        </Button>
      </div>
    </article>
  );
}
