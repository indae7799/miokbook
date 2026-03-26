import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import EventCard from '@/components/events/EventCard';
import type { EventCardEvent } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { getEventsList, type EventType } from '@/lib/events';
import { isEventClosed } from '@/lib/event-date';

export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 600;

export const metadata: Metadata = {
  title: '이벤트',
  description: '미옥서원에서 진행 중인 북클럽, 북콘서트, 저자와의 만남 일정을 확인하세요.',
  alternates: { canonical: '/events' },
  openGraph: { url: '/events', title: '이벤트' },
};

const PAGE_SIZE = 4;

const TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'author_talk', label: '공연' },
  { value: 'book_club', label: '독서모임' },
  { value: 'book_concert', label: '북콘서트' },
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
  const typeFilter = (type === 'author_talk' || type === 'book_club' || type === 'book_concert' ? type : '') as EventType;
  const parsedPage = Number.parseInt(page ?? '1', 10);

  let list: EventCardEvent[] = [];
  try {
    const events = await getEventsList(typeFilter);
    list = events.filter((event) => !isEventClosed(event.date)).map((event) => ({
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
      <h1 className="mb-4 text-xl font-semibold sm:text-2xl">이벤트</h1>

      <nav className="mb-6 flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((option) => (
          <Link
            key={option.value || 'all'}
            href={getPageHref(option.value, 1)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
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
          <div className="mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:max-w-[1050px] lg:gap-10">
            {pagedList.map((event, index) => (
              <EventCard key={event.eventId} event={event} showBadges={index === 0} priority={index === 0} />
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
