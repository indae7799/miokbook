import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Clock3, MapPin, PlayCircle } from 'lucide-react';
import StoreFooter from '@/components/home/StoreFooter';
import YoutubeContentCard from '@/components/content/YoutubeContentCard';
import { getPublishedYoutubeContentsList } from '@/lib/youtube-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const revalidate = 300;

export const metadata: Metadata = {
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

function getConcertYear(date: string | null): string {
  if (!date) return '미정';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '미정';
  return String(value.getFullYear());
}

function formatDateLabel(date: string | null): string {
  if (!date) return '일정 추후 공개';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '일정 추후 공개';
  return value.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function summarize(text?: string, max = 140) {
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '미옥서원에서 준비 중인 북콘서트입니다.';
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
}

async function getConcerts(): Promise<ConcertListItem[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('concerts')
      .select('*')
      .eq('is_active', true)
      .order('date', { ascending: false });

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

  const featuredConcert = concerts[0] ?? null;
  const currentConcerts = concerts.slice(0, 3);
  const archiveConcerts = concerts.slice(3);

  const archiveGroups = archiveConcerts.reduce<Record<string, ConcertListItem[]>>((acc, concert) => {
    const year = getConcertYear(concert.date);
    if (!acc[year]) acc[year] = [];
    acc[year].push(concert);
    return acc;
  }, {});

  const archiveYears = Object.keys(archiveGroups).sort((a, b) => {
    if (a === '미정') return 1;
    if (b === '미정') return -1;
    return Number(b) - Number(a);
  });

  const reviewIds = currentConcerts.flatMap((concert) => concert.reviewYoutubeIds ?? []);
  const uniqueReviewIds = Array.from(new Set(reviewIds.filter(Boolean)));
  const reviewVideos = uniqueReviewIds.length > 0
    ? videos.filter((video) => uniqueReviewIds.includes(video.id)).slice(0, 6)
    : videos.slice(0, 6);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ed_0%,#fbf8f3_24%,#ffffff_100%)]">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        <section className="border-b border-[#2f241f]/10 pb-10">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d6e5a]">
              Miok Seowon Book Concert
            </p>
            <h1 className="mt-4 font-myeongjo text-[34px] font-bold leading-[1.12] tracking-tight text-[#201714] sm:text-[50px] xl:text-[62px]">
              문장과 목소리가
              <br />
              한 자리에 머무는 밤
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-8 text-[#62514a] sm:text-[15px]">
              미옥서원의 북콘서트는 신간 소개를 넘어, 책을 둘러싼 이야기와 낭독, 질문과 대화가
              한 흐름으로 이어지는 자리입니다. 지금 진행 중인 북콘서트와 지나온 기록을 한곳에서
              살펴보실 수 있습니다.
            </p>
          </div>

          {featuredConcert ? (
            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
              <Link
                href={`/concerts/${featuredConcert.slug}`}
                className="group overflow-hidden rounded-[32px] border border-[#2f241f]/10 bg-[#1a1411] shadow-[0_30px_90px_-52px_rgba(36,24,21,0.55)]"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  {featuredConcert.imageUrl ? (
                    <Image
                      src={featuredConcert.imageUrl}
                      alt={featuredConcert.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 820px"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,6,5,0.08)_0%,rgba(8,6,5,0.68)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#201714]">
                        최신 북콘서트
                      </span>
                      {featuredConcert.statusBadge ? (
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                          {featuredConcert.statusBadge}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-4 font-myeongjo text-2xl font-bold leading-[1.22] text-white sm:text-[34px]">
                      {featuredConcert.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/82">
                      {summarize(featuredConcert.description, 150)}
                    </p>
                  </div>
                </div>
              </Link>

              <aside className="grid gap-4 rounded-[28px] border border-[#2f241f]/10 bg-white px-6 py-6 shadow-[0_24px_50px_-42px_rgba(36,24,21,0.22)] sm:px-7">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">
                    Current Session
                  </p>
                  <h3 className="mt-3 text-[24px] font-semibold leading-[1.28] text-[#201714]">
                    {featuredConcert.title}
                  </h3>
                </div>
                <div className="grid gap-3 text-sm text-[#4b3c37]">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="size-4 text-[#8d6e5a]" />
                    <span>{formatDateLabel(featuredConcert.date)}</span>
                  </div>
                  {featuredConcert.feeLabel ? (
                    <div className="flex items-center gap-3">
                      <Clock3 className="size-4 text-[#8d6e5a]" />
                      <span>{featuredConcert.feeLabel}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <MapPin className="size-4 text-[#8d6e5a]" />
                    <span>미옥서원 북콘서트 페이지에서 상세 안내 확인</span>
                  </div>
                </div>
                <Link
                  href={`/concerts/${featuredConcert.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#201714]"
                >
                  북콘서트 게시물 보기
                  <ArrowUpRight className="size-4" />
                </Link>
              </aside>
            </div>
          ) : null}
        </section>

        <section className="mt-14">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">Current Lineup</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">진행 중인 북콘서트</h2>
            <p className="mt-2 text-sm leading-7 text-[#62514a]">
              현재 열려 있는 북콘서트를 포스터 중심으로 살펴보실 수 있습니다.
            </p>
          </div>

          {currentConcerts.length === 0 ? (
            <p className="rounded-[24px] border border-dashed border-border bg-white px-6 py-16 text-sm text-muted-foreground">
              예정된 북콘서트가 없습니다.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {currentConcerts.map((concert) => (
                <Link
                  key={concert.id}
                  href={`/concerts/${concert.slug}`}
                  className="group overflow-hidden rounded-[28px] border border-[#2f241f]/8 bg-white shadow-[0_24px_60px_-48px_rgba(36,24,21,0.28)] transition-all hover:border-[#2f241f]/14 hover:shadow-[0_30px_70px_-46px_rgba(36,24,21,0.34)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[linear-gradient(180deg,#efe4d5_0%,#e5d5c0_100%)]">
                    {concert.imageUrl ? (
                      <Image
                        src={concert.imageUrl}
                        alt={concert.title}
                        fill
                        sizes="(max-width: 1280px) 100vw, 420px"
                        className="object-contain object-center p-4 transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : null}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
                      {concert.statusBadge ? (
                        <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#201714]">
                          {concert.statusBadge}
                        </span>
                      ) : (
                        <span />
                      )}
                      {concert.feeLabel ? (
                        <span className="rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                          {concert.feeLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-5 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d6e5a]">
                      {formatDateLabel(concert.date)}
                    </p>
                    <h3 className="mt-3 font-myeongjo text-[22px] font-bold leading-[1.28] text-[#201714]">
                      {concert.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#62514a]">
                      {summarize(concert.description, 110)}
                    </p>
                    <div className="mt-5 flex items-center justify-end border-t border-[#2f241f]/8 pt-3">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-[#201714]">
                        자세히 보기
                        <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {archiveConcerts.length > 0 ? (
          <section className="mt-16">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">Concert Archive</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">이전 북콘서트 아카이브</h2>
              <p className="mt-2 text-sm leading-7 text-[#62514a]">
                지나온 북콘서트는 연도별 기록형 목록으로 정리했습니다.
              </p>
            </div>

            <div className="sticky top-16 z-10 mb-6 overflow-x-auto border-y border-[#2f241f]/10 bg-[#fbf8f3]/92 py-3 backdrop-blur">
              <div className="flex min-w-max items-center gap-2 pr-4">
                <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">
                  Jump To Year
                </span>
                {archiveYears.map((year) => (
                  <a
                    key={year}
                    href={`#archive-${year}`}
                    className="rounded-full border border-[#2f241f]/10 bg-white px-3 py-1.5 text-xs font-medium text-[#201714] transition-colors hover:border-[#2f241f]/18 hover:bg-[#fcf7f1]"
                  >
                    {year}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              {archiveYears.map((year) => (
                <section
                  key={year}
                  id={`archive-${year}`}
                  className="scroll-mt-28 grid gap-4 xl:grid-cols-[120px_minmax(0,1fr)] xl:gap-6"
                >
                  <div className="xl:pt-3">
                    <p className="text-[28px] font-semibold leading-none text-[#201714]">{year}</p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">
                      Archive Year
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-[#2f241f]/8 bg-white">
                    {archiveGroups[year].map((concert) => (
                      <Link
                        key={concert.id}
                        href={`/concerts/${concert.slug}`}
                        className="grid gap-3 border-b border-[#2f241f]/10 px-5 py-4 transition-colors hover:bg-[#fcf7f1] last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">
                          {formatDateLabel(concert.date)}
                        </p>
                        <div className="min-w-0">
                          <p className="text-[17px] font-semibold leading-7 text-[#201714]">{concert.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#62514a]">
                            {summarize(concert.description, 120)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-[#201714]">
                          보기
                          <ArrowUpRight className="size-4" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-16">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">After The Concert</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">북콘서트 후기 영상</h2>
            <p className="mt-2 text-sm leading-7 text-[#62514a]">
              현장의 온도를 다시 보고 싶은 분들을 위해 관련 영상을 함께 모았습니다.
            </p>
          </div>

          {reviewVideos.length === 0 ? (
            <p className="rounded-[24px] border border-dashed border-border bg-white px-6 py-16 text-sm text-muted-foreground">
              등록된 후기 영상이 없습니다.
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

        <div className="mt-20">
          <StoreFooter />
        </div>
      </div>
    </main>
  );
}
