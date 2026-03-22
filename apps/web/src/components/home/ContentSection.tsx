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
  title = '\uCF58\uD150\uCE20',
}: ContentSectionProps) {
  const youtubeForShowcase = youtubeItems.filter((item) => item.youtubeId || item.externalPlaybackUrl);
  const hasAny = youtubeForShowcase.length > 0 || articles.length > 0;
  const youtubeHeading = '\uBBF8\uC625\uC11C\uC6D0 \uC601\uC0C1 \uC544\uCE74\uC774\uBE0C';
  const youtubeSubtitle =
    '\uBD81\uD1A0\uD06C \uBC0F \uCD5C\uC2E0 \uB17C\uC220 \uAD00\uB828 \uC815\uBCF4\uB97C \uB2F4\uC740 \uC601\uC0C1 \uC774\uC57C\uAE30';

  if (!hasAny) {
    return (
      <section className="space-y-5">
        <SectionHeading
          title={youtubeHeading}
          subtitle={youtubeSubtitle}
          rightSlot={
            <Link href="/content" className="text-sm text-primary hover:underline">
              {'\uC804\uCCB4 \uBCF4\uAE30'}
            </Link>
          }
        />
        <div className="rounded-[24px] border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {
              '\uC544\uC9C1 \uD45C\uC2DC\uD560 \uC601\uC0C1 \uB610\uB294 \uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.'
            }
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {youtubeForShowcase.length > 0 ? (
        <section className="space-y-5">
          <SectionHeading
            title={youtubeHeading}
            subtitle={youtubeSubtitle}
            rightSlot={
              <Link href="/content" className="text-sm text-primary hover:underline">
                {'\uC804\uCCB4 \uBCF4\uAE30'}
              </Link>
            }
          />
          <YoutubeShowcaseSection items={youtubeForShowcase.slice(0, 8)} />
        </section>
      ) : null}

      {articles.length > 0 ? (
        <section className="space-y-5">
          <SectionHeading
            title={youtubeForShowcase.length > 0 ? '\uC601\uC0C1 \uB2E4\uC74C\uC73C\uB85C \uC77D\uB294 \uBBF8\uC625\uC11C\uC6D0' : title}
            subtitle={'\uCD9C\uD310 \uC774\uC57C\uAE30\uC640 \uC11C\uC810 \uC774\uC57C\uAE30, \uBBF8\uC625\uC11C\uC6D0\uC758 \uAE00\uC744 \uBAA8\uC544\uB461\uB2C8\uB2E4.'}
            rightSlot={
              <Link href="/content" className="text-sm text-primary hover:underline">
                {'\uC804\uCCB4 \uBCF4\uAE30'}
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
