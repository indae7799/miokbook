import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import EventRegisterButton from '@/components/events/EventRegisterButton';
import { Button } from '@/components/ui/button';
import { getEventById, getEventTypeLabel } from '@/lib/events';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 600;

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function getConcertOverrides(eventId: string) {
  if (!supabaseAdmin) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('concerts')
      .select('image_url, booking_url, google_maps_embed_url')
      .eq('id', eventId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      imageUrl: String(data.image_url ?? '').trim(),
      bookingUrl: String(data.booking_url ?? data.google_maps_embed_url ?? '').trim(),
    };
  } catch {
    return null;
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const concertOverrides = event.type === 'book_concert' ? await getConcertOverrides(event.eventId) : null;
  const dateStr = formatEventDate(event.date);
  const typeLabel = getEventTypeLabel(event.type);
  const imageUrl = concertOverrides?.imageUrl || event.imageUrl?.trim();
  const bookingUrl = concertOverrides?.bookingUrl || '';

  return (
    <main className="mx-auto min-h-screen max-w-3xl py-6">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/events">이벤트 목록</Link>
        </Button>
      </div>

      <article className="space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
          {imageUrl ? (
            <Image src={imageUrl} alt={event.title} fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No Image</div>
          )}
        </div>

        <span className="text-sm text-muted-foreground">{typeLabel}</span>
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        {dateStr ? <p className="text-muted-foreground">{dateStr}</p> : null}
        {event.location ? <p className="text-muted-foreground">장소: {event.location}</p> : null}
        {event.description ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
            {event.description}
          </div>
        ) : null}

        {event.type === 'book_concert' && bookingUrl ? (
          <Button asChild className="w-full sm:w-auto">
            <a href={bookingUrl}>
              <MapPin className="mr-1 size-4" />
              이벤트 신청하기
            </a>
          </Button>
        ) : (
          <EventRegisterButton
            eventId={event.eventId}
            eventTitle={event.title}
            capacity={event.capacity}
            registeredCount={event.registeredCount}
            eventDate={event.date}
          />
        )}
      </article>
    </main>
  );
}
