import type { Metadata } from 'next';
import { getPublishedYoutubeContentsList } from '@/lib/youtube-store';
import YoutubeContentCard from '@/components/content/YoutubeContentCard';
import YoutubeShowcaseSection from '@/components/content/YoutubeShowcaseSection';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '콘텐츠',
  description: '미옥서원의 영상과 아카이브 콘텐츠를 한곳에서 확인해보세요.',
  alternates: { canonical: '/content' },
  openGraph: { url: '/content', title: '콘텐츠' },
};

export default async function ContentPage() {
  let videos: Awaited<ReturnType<typeof getPublishedYoutubeContentsList>> = [];

  try {
    videos = await getPublishedYoutubeContentsList('youtube');
  } catch {
    // no-op
  }

  const empty = videos.length === 0;

  return (
    <main className="min-h-screen space-y-14 py-6">
      <section className="w-full overflow-hidden bg-gradient-to-br from-[#2C0D1A] via-[#4A1728] to-[#6B2435] py-10 text-white shadow-[0_24px_60px_-36px_rgba(74,23,40,0.65)]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="max-w-4xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E8A8B8]">
              Miok Seowon Archive
            </p>
            <h1 className="font-myeongjo text-3xl font-semibold leading-tight text-white sm:text-[42px]">
              영상 콘텐츠
            </h1>
            <p className="max-w-[22rem] text-pretty text-sm leading-6 text-[#F0D0D8] sm:max-w-2xl sm:text-[15px] sm:leading-7">
              미옥서원에서 운영하는 유튜브 영상만 모아 한곳에서 볼 수 있도록 정리했습니다.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] space-y-14 px-4 sm:px-6">
        {empty ? <p className="py-8 text-sm text-muted-foreground">등록된 영상 콘텐츠가 없습니다.</p> : null}

        {videos.length > 0 ? (
          <div className="space-y-8">
            <div className="hidden md:block">
              <YoutubeShowcaseSection items={videos.slice(0, 4)} />
            </div>

            <section className="space-y-6 pt-[30px]">
              <div className="flex items-center gap-4">
                <h2 className="shrink-0 text-2xl font-bold tracking-tight text-foreground">전체 영상</h2>
                <div className="h-[2px] flex-1 bg-gradient-to-r from-[#722f37]/80 via-[#722f37]/30 to-transparent" />
              </div>
              <p className="text-sm text-muted-foreground">
                유튜브에 등록된 영상을 한 번에 둘러볼 수 있도록 정리했습니다.
              </p>
              <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-10 xl:gap-y-14">
                {videos.map((item) => (
                  <YoutubeContentCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
