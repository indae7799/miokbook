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
    const [articles, yt] = await Promise.all([getArticlesList(), getPublishedYoutubeContentsList()]);
    list = articles.map((a) => ({
      articleId: a.articleId,
      slug: a.slug,
      type: a.type,
      title: a.title,
      thumbnailUrl: a.thumbnailUrl,
    }));
    videos = yt;
  } catch {
    // no-op
  }

  const empty = list.length === 0 && videos.length === 0;

  return (
    <main className="min-h-screen space-y-12 py-6 mx-auto max-w-[1400px] px-4 sm:px-6">
      <section className="rounded-[30px] border border-[#722f37]/10 bg-[linear-gradient(135deg,#fffaf7_0%,#fff_40%,#f4ebe2_100%)] px-6 py-8 shadow-[0_20px_60px_rgba(114,47,55,0.08)] sm:px-8">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex rounded-full border border-[#722f37]/10 bg-[#722f37]/6 px-3 py-1 text-xs font-semibold text-[#722f37]">
            Miok Curation Library
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            영상과 글로 이어지는 미옥서원의 큐레이션 아카이브
          </h1>
          <p className="text-sm leading-7 text-muted-foreground sm:text-[15px]">
            먼저 보고 싶은 영상은 크게, 오래 읽고 싶은 이야기는 카드 섹션으로 정리했습니다.
            탐색은 가볍게 시작하되, 상세 페이지에서는 깊게 머물 수 있게 구성했습니다.
          </p>
        </div>
      </section>

      {empty ? <p className="py-8 text-sm text-muted-foreground">등록된 콘텐츠가 없습니다.</p> : null}

      {videos.length > 0 ? (
        <div className="space-y-6">
          <YoutubeShowcaseSection items={videos.slice(0, 4)} />
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">전체 영상</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                썸네일과 요약만 보고도 클릭하고 싶게, 카드형으로 정리했습니다.
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
              영상과 나란히 읽을 수 있도록 서점의 기록과 인터뷰도 카드 섹션으로 모았습니다.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((article) => (
              <ArticleCard key={article.articleId} article={article} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
