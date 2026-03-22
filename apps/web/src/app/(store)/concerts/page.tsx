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
    getPublishedYoutubeContentsList().catch(() => []),
  ]);

  const featuredConcerts = concerts.slice(0, 3);
  const reviewIds = featuredConcerts.flatMap((concert) => concert.reviewYoutubeIds ?? []);
  const uniqueReviewIds = Array.from(new Set(reviewIds.filter(Boolean)));
  const reviewVideos = uniqueReviewIds.length > 0
    ? videos.filter((video) => uniqueReviewIds.includes(video.id)).slice(0, 6)
    : videos.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <section className="rounded-[32px] border border-[#2f241f]/8 bg-[linear-gradient(180deg,#f7f2ea_0%,#fcfaf6_100%)] px-6 py-8 shadow-[0_24px_80px_-54px_rgba(36,24,21,0.3)] sm:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8d6e5a]">
              Miok Seowon Book Concert
            </p>
            <h1 className="mt-3 font-myeongjo text-[34px] font-bold leading-[1.2] tracking-tight text-[#201714] sm:text-[44px]">
              서점 안에서 이어지는
              <br />
              문장과 독자의 만남
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#62514a] sm:text-[15px]">
              문장과 사람, 서점의 공기가 한자리에 모이는 시간을 소개합니다.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">Upcoming</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#201714]">북콘서트</h2>
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
