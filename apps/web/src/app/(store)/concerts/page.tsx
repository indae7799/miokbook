import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import StoreFooter from '@/components/home/StoreFooter';
import ConcertVerticalCard, { type ConcertVerticalCardItem } from '@/components/concerts/ConcertVerticalCard';
import YoutubeContentCard from '@/components/content/YoutubeContentCard';
import { getPublishedYoutubeContentsList } from '@/lib/youtube-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const revalidate = 300;

interface ConcertListItem extends ConcertVerticalCardItem {
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

  const featuredConcerts = concerts.slice(0, 3);
  const archiveConcerts = concerts.slice(3);
  const latestConcert = concerts[0] ?? null;
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

  const reviewIds = featuredConcerts.flatMap((concert) => concert.reviewYoutubeIds ?? []);
  const uniqueReviewIds = Array.from(new Set(reviewIds.filter(Boolean)));
  const reviewVideos = uniqueReviewIds.length > 0
    ? videos.filter((video) => uniqueReviewIds.includes(video.id)).slice(0, 6)
    : videos.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <section className="border-b border-[#2f241f]/10 pb-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_360px] xl:items-end">
            <div className="max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d6e5a]">
                Miok Seowon Book Concert
              </p>
              <h1 className="mt-4 font-myeongjo text-[34px] font-bold leading-[1.14] tracking-tight text-[#201714] sm:text-[48px] xl:text-[56px]">
                책과 사람의 온도를
                <br />
                한 자리에서 듣는 밤
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#62514a] sm:text-[15px]">
                북콘서트는 신간 소개보다 한 걸음 더 깊게 들어갑니다. 저자, 문장, 낭독, 대화를 한 흐름으로
                엮어 미옥서원 안의 공기를 그대로 남깁니다.
              </p>
            </div>

            <aside className="grid gap-3 border-t border-[#2f241f]/10 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">Current</p>
                  <p className="mt-1 text-[26px] font-semibold leading-none text-[#201714]">{concerts.length}</p>
                </div>
                <p className="text-right text-xs leading-5 text-[#7b675f]">
                  페이지 번호 대신
                  <br />
                  아래 아카이브로 계속 이어집니다.
                </p>
              </div>

              <div className="rounded-[22px] border border-[#2f241f]/8 bg-white/78 p-4 shadow-[0_18px_40px_-34px_rgba(36,24,21,0.28)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">Latest Session</p>
                {latestConcert ? (
                  <>
                    <p className="mt-2 text-[18px] font-semibold leading-[1.35] text-[#201714]">{latestConcert.title}</p>
                    <p className="mt-2 text-sm text-[#62514a]">{formatDateLabel(latestConcert.date)}</p>
                    <Link
                      href={`/concerts/${latestConcert.slug}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#201714]"
                    >
                      자세히 보기 <ArrowUpRight className="size-4" />
                    </Link>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[#62514a]">새 북콘서트 일정은 준비 중입니다.</p>
                )}
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">Current Lineup</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">진행 중인 북콘서트</h2>
            </div>
          </div>

          {featuredConcerts.length === 0 ? (
            <p className="rounded-[24px] border border-dashed border-border bg-white px-6 py-16 text-sm text-muted-foreground">
              예정된 북콘서트가 없습니다.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featuredConcerts.map((concert) => (
                <ConcertVerticalCard key={concert.id} item={concert} />
              ))}
            </div>
          )}
        </section>

        {archiveConcerts.length > 0 ? (
          <section className="mt-14">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">Concert Archive</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">이전 북콘서트 아카이브</h2>
              <p className="mt-2 text-sm leading-6 text-[#62514a]">
                개수가 늘어나면 페이지를 넘기기보다 연도 흐름 안에서 이어 보게 하는 편이 북콘서트 기록에 더 맞습니다.
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

                  <div className="divide-y divide-[#2f241f]/10 rounded-[24px] border border-[#2f241f]/8 bg-white">
                    {archiveGroups[year].map((concert) => (
                      <Link
                        key={concert.id}
                        href={`/concerts/${concert.slug}`}
                        className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#fcf7f1] sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">
                          {formatDateLabel(concert.date)}
                        </p>
                        <div className="min-w-0">
                          <p className="text-[17px] font-semibold leading-7 text-[#201714]">{concert.title}</p>
                          {concert.description ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#62514a]">{concert.description}</p>
                          ) : null}
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-[#201714]">
                          보기 <ArrowUpRight className="size-4" />
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
          </div>

          {reviewVideos.length === 0 ? (
            <p className="rounded-[24px] border border-dashed border-border bg-white px-6 py-16 text-sm text-muted-foreground">
              등록된 후기 영상이 없습니다.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {reviewVideos.map((item) => (
                <YoutubeContentCard key={item.id} item={item} />
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
