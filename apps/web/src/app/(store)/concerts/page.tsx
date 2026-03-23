import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BookOpen, CalendarDays, PlayCircle } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';
import { getPublishedYoutubeContentsList } from '@/lib/youtube-store';
import StoreFooter from '@/components/home/StoreFooter';
import ConcertPurchasePanel from '@/components/concerts/ConcertPurchasePanel';
import YoutubeContentCard from '@/components/content/YoutubeContentCard';

export const revalidate = 300;

export const metadata: Metadata = {
  title: '북콘서트 | 미옥서원',
  alternates: { canonical: '/concerts' },
  openGraph: { url: '/concerts', title: '북콘서트 | 미옥서원' },
};

interface ConcertView {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  bookingUrl: string;
  feeLabel: string;
  feeNote: string;
  hostNote: string;
  statusBadge: string;
  ticketPrice: number;
  ticketOpen: boolean;
  date: string | null;
  reviewYoutubeIds: string[];
  description: string;
}

function parsePriceLabel(label: string): number {
  const digits = label.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function parseDateValue(date: string | null) {
  if (!date) return null;
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? null : value;
}

function formatConcertDate(date: string | null) {
  const value = parseDateValue(date);
  if (!value) return '일정 추후 공개';
  return value.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function getConcertData() {
  const { data, error } = await supabaseAdmin
    .from('concerts')
    .select('*')
    .eq('is_active', true)
    .order('date', { ascending: true, nullsFirst: false });

  if (error) throw error;

  const rows = (data ?? []).map(mapConcertRow);
  const now = Date.now();

  const current = rows.find((row) => {
    const value = parseDateValue(row.date);
    return value ? value.getTime() >= now : false;
  }) ?? rows[0] ?? null;

  if (!current) {
    return { current: null, next: null as ConcertView | null, past: [] as ConcertView[] };
  }

  const currentId = current.id;

  const mapConcert = (row: ReturnType<typeof mapConcertRow>): ConcertView => {
    const fallbackPrice = parsePriceLabel(row.feeLabel);
    return {
      id: row.id,
      title: row.title,
      slug: row.slug || row.id,
      imageUrl: row.imageUrl,
      bookingUrl: row.bookingUrl || row.googleMapsEmbedUrl,
      feeLabel: row.feeLabel,
      feeNote: row.feeNote || '현장 결제 가능',
      hostNote: row.hostNote || '',
      statusBadge: row.statusBadge,
      ticketPrice: row.ticketPrice > 0 ? row.ticketPrice : fallbackPrice,
      ticketOpen: row.ticketOpen || row.ticketPrice > 0 || fallbackPrice > 0,
      date: row.date,
      reviewYoutubeIds: row.reviewYoutubeIds ?? [],
      description: row.description,
    };
  };

  const futureRows = rows.filter((row) => {
    const value = parseDateValue(row.date);
    return value ? value.getTime() >= now : false;
  });

  const nextRow = futureRows.find((row) => row.id !== currentId) ?? null;

  const currentView = mapConcert(current);
  const nextView = nextRow ? mapConcert(nextRow) : null;
  const pastViews = rows
    .filter((row) => row.id !== currentId)
    .filter((row) => {
      const value = parseDateValue(row.date);
      return value ? value.getTime() < now : false;
    })
    .sort((a, b) => (parseDateValue(b.date)?.getTime() ?? 0) - (parseDateValue(a.date)?.getTime() ?? 0))
    .map(mapConcert);

  return { current: currentView, next: nextView, past: pastViews };
}

export default async function ConcertsPage() {
  const [{ current, next, past }, videos] = await Promise.all([
    getConcertData(),
    getPublishedYoutubeContentsList('concert').catch(() => []),
  ]);

  if (!current) notFound();

  const reviewVideos = current.reviewYoutubeIds.length > 0
    ? videos.filter((video) => current.reviewYoutubeIds.includes(video.id)).slice(0, 6)
    : videos.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[#2f241f]/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">
            Miok Seowon Book Concert
          </p>
          <h1 className="mt-4 font-myeongjo text-[30px] font-bold leading-[1.12] tracking-tight text-[#201714] [text-wrap:balance] sm:text-[44px] xl:text-[54px]">
            책과 사람을 만나
            <br />
            오래 머무는 자리
          </h1>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-stretch">
          <div className="flex min-h-[860px] items-center justify-center lg:h-[860px]">
            <Link href={`/concerts/${current.slug}`} className="flex h-full w-full items-center justify-center">
              {current.imageUrl ? (
                <Image
                  src={current.imageUrl}
                  alt={current.title}
                  width={1200}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 780px"
                  className="h-full w-full object-contain"
                  priority
                  unoptimized
                />
              ) : (
                <div className="aspect-[4/3] h-full w-full bg-[#efe4d5]" />
              )}
            </Link>
          </div>

          <div className="grid gap-4 lg:h-[860px] lg:grid-rows-[0.9fr_1.1fr]">
            <ConcertPurchasePanel
              className="min-h-0"
              feeLabel={current.feeLabel}
              feeNote={current.feeNote}
              hostNote={current.hostNote}
              statusBadge={current.statusBadge}
              ticketPrice={current.ticketPrice}
              ticketOpen={current.ticketOpen}
              mapUrl={current.bookingUrl}
              concertDate={current.date}
            />

            <section className="flex min-h-0 flex-col border border-[#722f37]/18 bg-white p-5">
              <div className="border-b border-[#722f37]/10 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#722f37]">
                  Next Concert
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-[#201714] [text-wrap:balance]">다음 북콘서트 일정</h2>
              </div>

              {next ? (
                <div className="mt-4 flex flex-1 flex-col justify-between">
                  <div>
                    {next.imageUrl ? (
                      <div className="relative mb-4 aspect-[2/3] w-full overflow-hidden border border-[#722f37]/10 bg-[#f7f3ee]">
                        <Image
                          src={next.imageUrl}
                          alt={next.title}
                          fill
                          className="object-cover"
                          sizes="400px"
                          unoptimized
                        />
                      </div>
                    ) : null}
                    <div className="inline-flex items-center gap-2 border border-[#722f37]/16 bg-[#f8f1f2] px-3 py-1.5 text-xs font-semibold text-[#722f37]">
                      <CalendarDays className="size-3.5" />
                      {formatConcertDate(next.date)}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-7 text-[#201714] [text-wrap:balance]">{next.title}</h3>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#5f4a42]">
                      {next.description || `다음 북콘서트 일정은\n${formatConcertDate(next.date)}입니다.`}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-dashed border-[#722f37]/12 pt-4">
                    <Link
                      href={`/concerts/${next.slug}`}
                      className="inline-flex h-11 items-center justify-center border border-[#722f37]/20 px-4 text-sm font-medium text-[#722f37] transition-colors hover:bg-[#f8f1f2]"
                    >
                      자세히 보기
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="relative mt-4 flex min-h-0 flex-1 items-end overflow-hidden border border-[#722f37]/10 bg-[#e9dfd2]">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'linear-gradient(0deg, rgba(32,23,20,0.72), rgba(32,23,20,0.18)), repeating-linear-gradient(90deg, rgba(114,47,55,0.16) 0 18px, rgba(251,248,243,0.18) 18px 26px, rgba(104,79,69,0.2) 26px 48px, rgba(247,243,238,0.18) 48px 60px)',
                    }}
                  />
                  <div className="relative z-10 flex h-full w-full flex-col justify-between p-6 text-white">
                    <div className="inline-flex size-12 items-center justify-center border border-white/20 bg-white/10">
                      <BookOpen className="size-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Coming Soon</p>
                      <h3 className="mt-3 text-2xl font-semibold leading-tight [text-wrap:balance]">다음 북콘서트 일정을 곧 안내합니다</h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/80">
                        새로운 만남을 준비하고 있습니다.
                        {'\n'}
                        다음 북콘서트가 열리면 이 영역에서 가장 먼저 안내됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">After The Concert</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">북콘서트 후기 영상</h2>
          </div>

          {reviewVideos.length === 0 ? (
            <p className="border border-dashed border-border bg-white px-6 py-16 text-sm text-muted-foreground">
              등록된 북콘서트 후기 영상이 없습니다.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {reviewVideos.map((item) => (
                <div key={item.id} className="relative">
                  <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 bg-[#722f37] px-3 py-1 text-[11px] font-medium text-white">
                    <PlayCircle className="size-3.5" />
                    후기 영상
                  </div>
                  <YoutubeContentCard item={item} />
                </div>
              ))}
            </div>
          )}
        </section>

        {past.length > 0 ? (
          <section className="mt-16">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">Concert Archive</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">지난 북콘서트</h2>
            </div>

            <section className="border border-[#2f241f]/10 bg-white p-5 sm:p-6">
              <div className="divide-y divide-[#2f241f]/8">
                {past.map((concert) => (
                  <Link
                    key={concert.id}
                    href={`/concerts/${concert.slug}`}
                    className="flex flex-col gap-2 py-4 transition-colors hover:text-[#8d6e5a] sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="font-medium text-[#201714]">{concert.title}</p>
                      {concert.description ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#62514a]">{concert.description}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-sm text-[#62514a]">{formatConcertDate(concert.date)}</div>
                  </Link>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        <div className="mt-16">
          <StoreFooter />
        </div>
      </div>
    </main>
  );
}
