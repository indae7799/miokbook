import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, PlayCircle } from 'lucide-react';
import StoreFooter from '@/components/home/StoreFooter';
import YoutubeContentCard from '@/components/content/YoutubeContentCard';
import { getPublishedYoutubeContentsList } from '@/lib/youtube-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const revalidate = 300;

export const metadata: Metadata = {
  title: '북콘서트 | 미옥서원',
  alternates: { canonical: '/concerts' },
  openGraph: { url: '/concerts', title: '북콘서트 | 미옥서원' },
};

interface ConcertListItem {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  date: string | null;
  statusBadge?: string;
  feeLabel?: string;
  description?: string;
  reviewYoutubeIds: string[];
}

function parseDateValue(date: string | null) {
  if (!date) return null;
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? null : value;
}

function formatDateLabel(date: string | null) {
  const value = parseDateValue(date);
  if (!value) return '일정 추후 공개';

  return value.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function summarize(text?: string, max = 170) {
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '미옥서원에서 준비 중인 북콘서트입니다.';
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
}

function getArchiveYear(date: string | null) {
  const value = parseDateValue(date);
  return value ? String(value.getFullYear()) : '미정';
}

async function getConcerts(): Promise<ConcertListItem[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('concerts')
      .select('*')
      .eq('is_active', true)
      .order('date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return (data ?? []).map((row) => {
      const concert = mapConcertRow(row);
      return {
        id: concert.id,
        title: concert.title,
        slug: concert.slug || concert.id,
        imageUrl: concert.imageUrl,
        date: concert.date,
        statusBadge: concert.statusBadge,
        feeLabel: concert.feeLabel,
        description: concert.description,
        reviewYoutubeIds: concert.reviewYoutubeIds ?? [],
      };
    });
  } catch {
    return [];
  }
}

export default async function ConcertsPage() {
  const [concerts, videos] = await Promise.all([
    getConcerts(),
    getPublishedYoutubeContentsList('concert').catch(() => []),
  ]);

  const now = new Date();
  const upcomingConcerts = concerts
    .filter((concert) => {
      const date = parseDateValue(concert.date);
      return date ? date.getTime() >= now.getTime() : false;
    })
    .sort((a, b) => (parseDateValue(a.date)?.getTime() ?? Infinity) - (parseDateValue(b.date)?.getTime() ?? Infinity));

  const currentConcert = upcomingConcerts[0] ?? null;
  const nextConcert = upcomingConcerts[1] ?? null;
  const pastConcerts = concerts
    .filter((concert) => {
      const date = parseDateValue(concert.date);
      return date ? date.getTime() < now.getTime() : true;
    })
    .sort((a, b) => (parseDateValue(b.date)?.getTime() ?? 0) - (parseDateValue(a.date)?.getTime() ?? 0));

  const archiveGroups = pastConcerts.reduce<Record<string, ConcertListItem[]>>((acc, concert) => {
    const year = getArchiveYear(concert.date);
    if (!acc[year]) acc[year] = [];
    acc[year].push(concert);
    return acc;
  }, {});

  const archiveYears = Object.keys(archiveGroups).sort((a, b) => {
    if (a === '미정') return 1;
    if (b === '미정') return -1;
    return Number(b) - Number(a);
  });

  const preferredReviewIds = [currentConcert, nextConcert]
    .flatMap((concert) => concert?.reviewYoutubeIds ?? [])
    .filter(Boolean);
  const reviewVideos = preferredReviewIds.length > 0
    ? videos.filter((video) => preferredReviewIds.includes(video.id)).slice(0, 6)
    : videos.slice(0, 6);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ed_0%,#fbf8f3_28%,#ffffff_100%)]">
      <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 sm:py-10">
        <section className="border-b border-[#2f241f]/10 pb-10">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d6e5a]">
              Miok Seowon Book Concert
            </p>
            <h1 className="mt-4 font-myeongjo text-[34px] font-bold leading-[1.12] tracking-tight text-[#201714] sm:text-[50px] xl:text-[62px]">
              책과 사람이 만나
              <br />
              오래 머무는 자리
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-8 text-[#62514a] sm:text-[15px]">
              북콘서트는 한 번에 여러 건을 나열하기보다, 지금 예약 중인 자리와 곧 이어질 다음 자리를 분명하게 보여주는 편이 더 좋습니다.
              현재 예약 중인 북콘서트를 중심으로 소개하고, 후기 영상과 지난 기록은 아래에서 차분히 이어집니다.
            </p>
          </div>

          {currentConcert ? (
            <div className="mt-10 overflow-hidden rounded-[34px] border border-[#2f241f]/10 bg-[#171210] shadow-[0_34px_100px_-54px_rgba(36,24,21,0.62)]">
              <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
                <Link href={`/concerts/${currentConcert.slug}`} className="group relative block min-h-[420px] overflow-hidden">
                  {currentConcert.imageUrl ? (
                    <Image
                      src={currentConcert.imageUrl}
                      alt={currentConcert.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 820px"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,7,0.12)_0%,rgba(10,8,7,0.78)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#201714]">
                        현재 예약 중
                      </span>
                      {currentConcert.statusBadge ? (
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                          {currentConcert.statusBadge}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-4 font-myeongjo text-[28px] font-bold leading-[1.2] text-white sm:text-[38px]">
                      {currentConcert.title}
                    </h2>
                  </div>
                </Link>

                <div className="flex flex-col justify-between gap-6 bg-[linear-gradient(180deg,#1f1815_0%,#171210_100%)] p-6 text-white sm:p-8">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
                      Current Booking
                    </p>
                    <h3 className="mt-4 text-[24px] font-semibold leading-[1.3] text-white">
                      {currentConcert.title}
                    </h3>
                    <div className="mt-6 space-y-3 text-sm text-white/78">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="size-4 text-white/55" />
                        <span>{formatDateLabel(currentConcert.date)}</span>
                      </div>
                      {currentConcert.feeLabel ? (
                        <p className="text-sm text-white/78">{currentConcert.feeLabel}</p>
                      ) : null}
                    </div>
                    <p className="mt-6 text-sm leading-7 text-white/84">
                      {summarize(currentConcert.description)}
                    </p>
                  </div>

                  <Link
                    href={`/concerts/${currentConcert.slug}`}
                    className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#201714]"
                  >
                    북콘서트 상세보기
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 rounded-[28px] border border-dashed border-[#2f241f]/14 bg-white px-6 py-12 text-sm leading-7 text-[#62514a]">
              현재 예약 중인 북콘서트가 아직 없습니다. 다음 일정이 등록되면 이 영역에 가장 먼저 노출됩니다.
            </div>
          )}
        </section>

        {nextConcert ? (
          <section className="mt-14">
            <div className="rounded-[28px] border border-[#2f241f]/10 bg-white px-6 py-6 shadow-[0_24px_48px_-40px_rgba(36,24,21,0.22)] sm:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6e5a]">
                    Coming Next
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold leading-[1.3] text-[#201714]">
                    다음 북콘서트 안내
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[#62514a]">
                    현재 예약 중인 일정 다음으로 열릴 북콘서트입니다. 운영 리듬상 필요한 경우 한 건만 간단하게 미리 안내합니다.
                  </p>
                </div>
                <Link
                  href={`/concerts/${nextConcert.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#201714]"
                >
                  다음 북콘서트 보기
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#efe4d5_0%,#e4d3bf_100%)]">
                  {nextConcert.imageUrl ? (
                    <Image
                      src={nextConcert.imageUrl}
                      alt={nextConcert.title}
                      fill
                      sizes="220px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f6efe5] px-3 py-1 text-[11px] font-semibold text-[#8d6e5a]">
                      곧 오픈 예정
                    </span>
                    {nextConcert.statusBadge ? (
                      <span className="rounded-full border border-[#2f241f]/10 px-3 py-1 text-[11px] font-medium text-[#62514a]">
                        {nextConcert.statusBadge}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-4 font-myeongjo text-[28px] font-bold leading-[1.24] text-[#201714]">
                    {nextConcert.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium text-[#62514a]">
                    {formatDateLabel(nextConcert.date)}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#62514a]">
                    {summarize(nextConcert.description, 150)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-16">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">After The Concert</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">북콘서트 후기 영상</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#62514a]">
              북콘서트의 분위기와 결을 가장 직접적으로 보여주는 건 후기 영상입니다. 처음 방문하는 분도 어떤 자리인지 빠르게 감을 잡을 수 있도록
              메인 영역 바로 아래에 배치했습니다.
            </p>
          </div>

          {reviewVideos.length === 0 ? (
            <p className="rounded-[24px] border border-dashed border-border bg-white px-6 py-16 text-sm text-muted-foreground">
              등록된 북콘서트 후기 영상이 없습니다.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {reviewVideos.map((item) => (
                <div key={item.id} className="relative">
                  <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-black/65 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    <PlayCircle className="size-3.5" />
                    후기 영상
                  </div>
                  <YoutubeContentCard item={item} />
                </div>
              ))}
            </div>
          )}
        </section>

        {pastConcerts.length > 0 ? (
          <section className="mt-16">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">Concert Archive</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">지난 북콘서트</h2>
              <p className="mt-2 text-sm leading-7 text-[#62514a]">
                지나간 북콘서트는 하단 아카이브로 모아 두었습니다. 현재 예약과 다음 일정에 방해되지 않도록 이미지보다 제목과 날짜 중심으로 정리했습니다.
              </p>
            </div>

            <div className="space-y-8">
              {archiveYears.map((year) => (
                <section key={year} className="rounded-[28px] border border-[#2f241f]/10 bg-white p-5 shadow-[0_20px_44px_-40px_rgba(36,24,21,0.22)] sm:p-6">
                  <div className="flex items-center justify-between gap-3 border-b border-[#2f241f]/8 pb-4">
                    <h3 className="text-lg font-semibold text-[#201714]">{year}</h3>
                    <span className="text-xs uppercase tracking-[0.18em] text-[#8d6e5a]">Archive</span>
                  </div>
                  <div className="divide-y divide-[#2f241f]/8">
                    {archiveGroups[year].map((concert) => (
                      <Link
                        key={concert.id}
                        href={`/concerts/${concert.slug}`}
                        className="flex flex-col gap-2 py-4 transition-colors hover:text-[#8d6e5a] sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="font-medium text-[#201714]">{concert.title}</p>
                          {concert.description ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#62514a]">
                              {summarize(concert.description, 110)}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-sm text-[#62514a]">{formatDateLabel(concert.date)}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-20">
          <StoreFooter />
        </div>
      </div>
    </main>
  );
}
