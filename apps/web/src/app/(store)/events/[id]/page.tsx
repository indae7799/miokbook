import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getEventById, getEventTypeLabel } from '@/lib/events';
import EventRegisterButton from '@/components/events/EventRegisterButton';
import { Button } from '@/components/ui/button';

export const revalidate = 60;

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const dateStr = formatEventDate(event.date);
  const typeLabel = getEventTypeLabel(event.type);

  return (
    <main className="min-h-screen py-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/events">← 이벤트 목록</Link>
        </Button>
      </div>
      <article className="space-y-4">
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
          <Image src={event.imageUrl} alt={event.title} fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
        </div>
        <span className="text-sm text-muted-foreground">{typeLabel}</span>
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        {dateStr && <p className="text-muted-foreground">{dateStr}</p>}
        {event.location && <p className="text-muted-foreground">장소: {event.location}</p>}
        {event.description && (
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
            {event.description}
          </div>
        )}
        <EventRegisterButton
          eventId={event.eventId}
          capacity={event.capacity}
          registeredCount={event.registeredCount}
        />
      </article>
    </main>
  );
}
