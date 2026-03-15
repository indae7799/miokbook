import Link from 'next/link';
import ArticleCard from '@/components/content/ArticleCard';
import type { ArticleCardArticle } from '@/components/content/ArticleCard';

export interface ContentSectionProps {
  articles: ArticleCardArticle[];
  title?: string;
}

export default function ContentSection({ articles, title = '콘텐츠' }: ContentSectionProps) {
  if (articles.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href="/content" className="text-sm text-primary hover:underline">
          전체 보기
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.slice(0, 3).map((article) => (
          <ArticleCard key={article.articleId} article={article} />
        ))}
      </div>
    </section>
  );
}
