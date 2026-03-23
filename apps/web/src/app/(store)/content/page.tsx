import { getArticlesList } from '@/lib/articles';
import { getPublishedYoutubeContentsList } from '@/lib/youtube-store';
import ArticleCard from '@/components/content/ArticleCard';
import type { ArticleCardArticle } from '@/components/content/ArticleCard';
import YoutubeContentCard from '@/components/content/YoutubeContentCard';
import YoutubeShowcaseSection from '@/components/content/YoutubeShowcaseSection';

export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  let list: ArticleCardArticle[] = [];
  let videos: Awaited<ReturnType<typeof getPublishedYoutubeContentsList>> = [];

  try {
    const [articles, yt] = await Promise.all([
      getArticlesList(),
      getPublishedYoutubeContentsList('youtube'),
    ]);

    list = articles.map((article) => ({
      articleId: article.articleId,
      slug: article.slug,
      type: article.type,
      title: article.title,
      thumbnailUrl: article.thumbnailUrl,
    }));
    videos = yt;
  } catch {
    // no-op
  }

  const empty = list.length === 0 && videos.length === 0;

  return (
    <main className="min-h-screen space-y-12 py-6">
      <section className="w-full overflow-hidden bg-gradient-to-br from-[#2C0D1A] via-[#4A1728] to-[#6B2435] py-10 text-white shadow-[0_24px_60px_-36px_rgba(74,23,40,0.65)]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="max-w-4xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E8A8B8]">
            Miok Seowon Archive
          </p>
          <h1 className="font-myeongjo text-3xl font-semibold leading-tight text-white sm:text-[42px]">
            미옥서원 영상 아카이브
          </h1>
          <p className="max-w-[22rem] text-pretty text-sm leading-6 text-[#F0D0D8] sm:max-w-2xl sm:text-[15px] sm:leading-7">
            인터뷰와 북토크, 서점의 기록과 최신 논술 관련 영상을 한곳에서 정리했습니다.
          </p>
        </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] space-y-12 px-4 sm:px-6">
        {empty ? <p className="py-8 text-sm text-muted-foreground">등록된 콘텐츠가 없습니다.</p> : null}

        {videos.length > 0 ? (
          <div className="space-y-6">
            <div className="hidden md:block">
              <YoutubeShowcaseSection items={videos.slice(0, 4)} />
            </div>

            <section className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">전체 영상</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  영상 목록은 한 번에 둘러보기 쉽도록 정리했습니다.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {videos.map((item) => (
                  <YoutubeContentCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {list.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">글과 인터뷰</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                영상과 함께 읽을 수 있도록 서점의 기록과 인터뷰를 모았습니다.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((article) => (
                <ArticleCard key={article.articleId} article={article} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
