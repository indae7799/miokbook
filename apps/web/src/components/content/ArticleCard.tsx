import Link from 'next/link';
import Image from 'next/image';

const TYPE_LABEL: Record<string, string> = {
  author_interview: '작가 인터뷰',
  bookstore_story: '서점 이야기',
  publisher_story: '출판 이야기',
};

export interface ArticleCardArticle {
  articleId: string;
  slug: string;
  type: string;
  title: string;
  thumbnailUrl: string;
}

export interface ArticleCardProps {
  article: ArticleCardArticle;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const typeLabel = TYPE_LABEL[article.type] ?? article.type;
  return (
    <article className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <Link href={`/content/${article.slug}`} className="block relative aspect-video w-full bg-muted">
        <Image
          src={article.thumbnailUrl}
          alt={article.title}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className="object-cover"
        />
      </Link>
      <div className="p-3 flex-1 flex flex-col min-h-[48px] justify-center">
        <span className="text-xs text-muted-foreground">{typeLabel}</span>
        <Link href={`/content/${article.slug}`} className="font-medium text-sm mt-0.5 hover:underline line-clamp-2">
          {article.title}
        </Link>
      </div>
    </article>
  );
}
