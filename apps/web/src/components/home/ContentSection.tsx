import Link from 'next/link';
import ArticleCard from '@/components/content/ArticleCard';
import type { ArticleCardArticle } from '@/components/content/ArticleCard';
import YoutubeShowcaseSection from '@/components/content/YoutubeShowcaseSection';
import type { YoutubeContentListItem } from '@/lib/youtube-store';
import SectionHeading from '@/components/home/SectionHeading';

export interface ContentSectionProps {
  articles: ArticleCardArticle[];
  youtubeItems?: YoutubeContentListItem[];
  title?: string;
}

export default function ContentSection({
  articles,
  youtubeItems = [],
  title = '콘텐츠',
}: ContentSectionProps) {
  const hasAny = youtubeItems.length > 0 || articles.length > 0;

  if (!hasAny) {
    return (
      <section className="space-y-4 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
        <h2 className="flex items-center justify-center gap-3 text-[28px] font-semibold leading-tight">
          <span className="home-section-title-bar h-[1.25em] w-1.5 shrink-0 md:w-2" aria-hidden />
          {title}
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          아직 노출 중인 영상이나 글이 없습니다. 잠시 후 다시 확인하거나 콘텐츠 메뉴에서 전체 목록을 확인해 주세요.
        </p>
        <Link href="/content" className="inline-block text-sm font-medium text-primary hover:underline">
          콘텐츠 전체 보기
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {youtubeItems.length > 0 ? <YoutubeShowcaseSection items={youtubeItems.slice(0, 4)} /> : null}

      {articles.length > 0 ? (
        <section className="space-y-5">
          <SectionHeading
            title={youtubeItems.length > 0 ? '영상 다음에 읽는 미옥서원' : title}
            subtitle="조금 더 천천히 머물고 싶은 인터뷰와 서점의 기록을 모았습니다."
            rightSlot={
              <Link href="/content" className="text-sm text-primary hover:underline">
                전체 보기
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.slice(0, 3).map((article) => (
              <ArticleCard key={article.articleId} article={article} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
