import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEventById, getEventTypeLabel } from '@/lib/events';
import { getEventButtonState } from '@/lib/event-date';
import StoreFooter from '@/components/home/StoreFooter';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 600;

const NAVER_PLACE_URL = 'https://naver.me/53lKvYM7';

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

async function getConcertOverrides(eventId: string, eventTitle: string) {
  if (!supabaseAdmin) return null;

  try {
    const { data: directMatch, error } = await supabaseAdmin
      .from('concerts')
      .select('id, title, image_url, booking_url, google_maps_embed_url')
      .eq('id', eventId)
      .maybeSingle();

    if (error) return null;

    const matchedConcert = directMatch
      ? directMatch
      : (
          await supabaseAdmin
            .from('concerts')
            .select('id, title, image_url, booking_url, google_maps_embed_url')
            .eq('title', eventTitle)
            .maybeSingle()
        ).data;

    if (!matchedConcert) return null;

    return {
      imageUrl: String(matchedConcert.image_url ?? '').trim(),
    };
  } catch {
    return null;
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const concertOverrides =
    event.type === 'book_concert' ? await getConcertOverrides(event.eventId, event.title) : null;

  const dateStr = formatEventDate(event.date);
  const typeLabel = getEventTypeLabel(event.type);
  const imageUrl = concertOverrides?.imageUrl || event.imageUrl?.trim();
  const buttonState = getEventButtonState(event.date);

  const buttonLabel =
    buttonState === 'closed' ? '종료' :
    buttonState === 'open_soon' ? '오픈예정' :
    '신청하기';

  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-5">
          <Button variant="ghost" asChild>
            <Link href="/events">이벤트</Link>
          </Button>
        </div>

        <section className="border-b border-[#2f241f]/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">
            {typeLabel}
          </p>
          <h1 className="mt-4 break-keep font-myeongjo text-[22px] font-bold leading-[1.2] tracking-tight text-[#201714] [text-wrap:balance] sm:text-[36px] lg:text-[44px] xl:text-[54px]">
            {event.title}
          </h1>
          {dateStr ? (
            <p className="mt-3 text-sm font-medium text-[#5c4741]">{dateStr}</p>
          ) : null}
        </section>

        <section className="mt-3 grid gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
          <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-auto sm:min-h-[540px] lg:h-[760px]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={event.title}
                width={1200}
                height={900}
                sizes="(max-width: 1024px) 100vw, 760px"
                className="h-full w-full object-contain bg-[#f7f1eb]"
                priority
                unoptimized
              />
            ) : (
              <div className="h-full w-full bg-[#efe4d5]" />
            )}
          </div>

          <div className="grid gap-3 lg:h-[760px] lg:grid-rows-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
            <aside className="flex min-h-[320px] flex-col border border-[#722f37]/18 bg-white p-5 lg:h-full">
              <div className="flex items-start justify-between gap-3 border-b border-[#722f37]/10 pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#722f37]">
                    Event Info
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-[#201714]">참가 안내</h2>
                </div>
              </div>

              <div className="mt-3 flex flex-1 flex-col gap-3">
                <div className="space-y-3 border border-[#722f37]/10 bg-[#fcfaf8] p-4">
                  {dateStr ? (
                    <div className="flex items-center gap-2 text-sm text-[#5f4a42]">
                      <CalendarDays className="size-4 shrink-0 text-[#722f37]" />
                      <span className="break-keep">{dateStr}</span>
                    </div>
                  ) : null}
                  {event.location ? (
                    <div className="flex items-center gap-2 text-sm text-[#5f4a42]">
                      <MapPin className="size-4 shrink-0 text-[#722f37]" />
                      <span className="break-keep">{event.location}</span>
                    </div>
                  ) : null}
                </div>

                {buttonState === 'closed' ? (
                  <div className="mt-auto flex h-12 items-center justify-center border border-dashed border-[#722f37]/16 px-4 text-center text-sm text-[#5f4a42]">
                    이미 종료된 이벤트입니다.
                  </div>
                ) : (
                  <a
                    href={NAVER_PLACE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex h-12 w-full items-center justify-center gap-1.5 bg-[#722f37] text-sm font-semibold text-white transition-colors hover:bg-[#5e2730] active:bg-[#5e2730]"
                  >
                    <MapPin className="size-4 shrink-0" />
                    {buttonLabel}
                  </a>
                )}
              </div>
            </aside>

            {event.description ? (
              <section className="flex flex-col border border-[#722f37]/18 bg-white p-5">
                <div className="border-b border-[#722f37]/10 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#722f37]">
                    About
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-[#201714]">이벤트 소개</h2>
                </div>
                <div className="mt-4 lg:min-h-0 lg:overflow-auto">
                  <p className="break-keep whitespace-pre-wrap text-sm leading-7 text-[#5f4a42]">
                    {event.description}
                  </p>
                </div>
              </section>
            ) : (
              <div className="relative min-h-[160px] overflow-hidden border border-[#722f37]/10 bg-[#e9dfd2]">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(0deg, rgba(32,23,20,0.72), rgba(32,23,20,0.18)), repeating-linear-gradient(90deg, rgba(114,47,55,0.16) 0 18px, rgba(251,248,243,0.18) 18px 26px, rgba(104,79,69,0.2) 26px 48px, rgba(247,243,238,0.18) 48px 60px)',
                  }}
                />
                <div className="relative z-10 flex h-full flex-col justify-end p-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Event</p>
                  <p className="mt-3 break-keep text-sm leading-6 text-white/80">
                    이벤트 상세 정보를 준비 중입니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mt-16">
          <StoreFooter />
        </div>
      </div>
    </main>
  );
}
