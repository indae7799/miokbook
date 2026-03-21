import { getArticlesList } from '@/lib/articles';
import { getPublishedYoutubeContentsList } from '@/lib/youtube-store';
import ArticleCard from '@/components/content/ArticleCard';
import type { ArticleCardArticle } from '@/components/content/ArticleCard';
import YoutubeContentCard from '@/components/content/YoutubeContentCard';

/** 어드민에서 영상을 추가해도 ISR 캐시 때문에 목록이 비어 보이지 않도록 항상 최신 조회 */
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
    // 500 방지
  }

  const empty = list.length === 0 && videos.length === 0;

  return (
    <main className="min-h-screen py-6 space-y-10">
      <h1 className="text-2xl font-semibold">콘텐츠</h1>

      {empty ? (
        <p className="text-muted-foreground text-sm py-8">등록된 콘텐츠가 없습니다.</p>
      ) : null}

      {videos.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">영상</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((item) => (
              <YoutubeContentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {list.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">글 · 인터뷰</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((article) => (
              <ArticleCard key={article.articleId} article={article} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
