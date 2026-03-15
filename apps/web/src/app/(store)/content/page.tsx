import { getArticlesList } from '@/lib/articles';
import ArticleCard from '@/components/content/ArticleCard';
import type { ArticleCardArticle } from '@/components/content/ArticleCard';

export const revalidate = 300;

export default async function ContentPage() {
  let list: ArticleCardArticle[] = [];
  try {
    const articles = await getArticlesList();
    list = articles.map((a) => ({
      articleId: a.articleId,
      slug: a.slug,
      type: a.type,
      title: a.title,
      thumbnailUrl: a.thumbnailUrl,
    }));
  } catch {
    // 500 방지
  }

  return (
    <main className="min-h-screen py-6">
      <h1 className="text-2xl font-semibold mb-4">콘텐츠</h1>
      {list.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">등록된 콘텐츠가 없습니다.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((article) => (
            <ArticleCard key={article.articleId} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
