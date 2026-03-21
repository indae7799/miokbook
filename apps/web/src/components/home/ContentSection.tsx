import Link from 'next/link';
import ArticleCard from '@/components/content/ArticleCard';
import type { ArticleCardArticle } from '@/components/content/ArticleCard';
import YoutubeContentCard from '@/components/content/YoutubeContentCard';
import type { YoutubeContentListItem } from '@/lib/youtube-store';
import SectionHeading from '@/components/home/SectionHeading';

export interface ContentSectionProps {
  articles: ArticleCardArticle[];
  /** 랜딩 「콘텐츠」에 노출할 발행 유튜브 (홈에서는 최대 3카드) */
  youtubeItems?: YoutubeContentListItem[];
  title?: string;
}

type HomeContentSlot =
  | { kind: 'video'; item: YoutubeContentListItem }
  | { kind: 'article'; item: ArticleCardArticle };

/** 영상을 먼저 채운 뒤 글 슬롯을 채웁니다 (총 max 카드). */
function mergeContentSlots(
  youtubeItems: YoutubeContentListItem[],
  articles: ArticleCardArticle[],
  max: number
): HomeContentSlot[] {
  const out: HomeContentSlot[] = [];
  for (const item of youtubeItems) {
    if (out.length >= max) break;
    out.push({ kind: 'video', item });
  }
  for (const item of articles) {
    if (out.length >= max) break;
    out.push({ kind: 'article', item });
  }
  return out;
}

export default function ContentSection({
  articles,
  youtubeItems = [],
  title = '콘텐츠',
}: ContentSectionProps) {
  const slots = mergeContentSlots(youtubeItems, articles, 3);
  const hasAny = slots.length > 0;

  if (!hasAny) {
    return (
      <section className="space-y-4 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
        <h2 className="flex items-center justify-center gap-3 text-[28px] font-semibold leading-tight">
          <span className="home-section-title-bar h-[1.25em] w-1.5 shrink-0 md:w-2" aria-hidden />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          아직 노출할 영상·글이 없습니다. 잠시 후 다시 확인하거나 콘텐츠 메뉴에서 전체를 둘러보세요.
        </p>
        <Link href="/content" className="inline-block text-sm font-medium text-primary hover:underline">
          콘텐츠 전체 →
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeading
        title={title}
        subtitle="영상과 글로 만나는 미옥서원 이야기"
        rightSlot={
          <Link href="/content" className="text-sm text-primary hover:underline">
            전체 보기
          </Link>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot) =>
          slot.kind === 'video' ? (
            <YoutubeContentCard key={`yt-${slot.item.id}`} item={slot.item} />
          ) : (
            <ArticleCard key={slot.item.articleId} article={slot.item} />
          )
        )}
      </div>
    </section>
  );
}
