import Link from 'next/link';
import { ChevronLeft, ChevronRight, Mic2 } from 'lucide-react';
import EventCard from '@/components/events/EventCard';
import type { EventCardEvent } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { getEventsList, type EventType } from '@/lib/events';

export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 600;

const PAGE_SIZE = 4;

const TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'author_talk', label: '공연' },
  { value: 'book_club', label: '독서모임' },
];

function getPageHref(typeFilter: EventType, page: number): string {
  const params = new URLSearchParams();
  if (typeFilter) params.set('type', typeFilter);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/events?${query}` : '/events';
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const { type, page } = await searchParams;
  const typeFilter = (type === 'book_concert' || type === 'author_talk' || type === 'book_club' ? type : '') as EventType;
  const parsedPage = Number.parseInt(page ?? '1', 10);

  let list: EventCardEvent[] = [];
  try {
    const events = await getEventsList(typeFilter);
    list = events.map((event) => ({
      eventId: event.eventId,
      title: event.title,
      type: event.type,
      description: event.description,
      imageUrl: event.imageUrl,
      date: event.date,
      location: event.location,
      capacity: event.capacity,
      registeredCount: event.registeredCount,
    }));
  } catch {
    list = [];
  }

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Number.isFinite(parsedPage) ? Math.min(Math.max(parsedPage, 1), totalPages) : 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedList = list.slice(startIndex, startIndex + PAGE_SIZE);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-semibold">이벤트</h1>

      <nav className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/concerts"
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
        >
          <Mic2 className="size-3.5" />
          북콘서트
        </Link>
        {TYPE_OPTIONS.map((option) => (
          <Link
            key={option.value || 'all'}
            href={getPageHref(option.value, 1)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              typeFilter === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {pagedList.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">등록된 이벤트가 없습니다.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {pagedList.map((event) => (
              <EventCard key={event.eventId} event={event} />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="이벤트 페이지 이동">
              <Button asChild variant="ghost" size="icon" className="size-9" disabled={!hasPrev}>
                <Link
                  href={hasPrev ? getPageHref(typeFilter, currentPage - 1) : getPageHref(typeFilter, currentPage)}
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              </Button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <Button
                  key={pageNumber}
                  asChild
                  variant={pageNumber === currentPage ? 'default' : 'ghost'}
                  size="icon"
                  className="size-9 text-sm"
                >
                  <Link href={getPageHref(typeFilter, pageNumber)} aria-current={pageNumber === currentPage ? 'page' : undefined}>
                    {pageNumber}
                  </Link>
                </Button>
              ))}

              <Button asChild variant="ghost" size="icon" className="size-9" disabled={!hasNext}>
                <Link
                  href={hasNext ? getPageHref(typeFilter, currentPage + 1) : getPageHref(typeFilter, currentPage)}
                  aria-label="다음 페이지"
                >
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}
