import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getArticleBySlug } from '@/lib/articles';
import { getArticleTypeLabel } from '@/lib/contentLabels';
import { Button } from '@/components/ui/button';
import MarkdownContent from '@/components/content/MarkdownContent';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: '콘텐츠' };
  return {
    title: article.title,
    description: article.content?.replace(/[#_*`\[\]\(\)!>-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160),
    alternates: { canonical: `/content/${slug}` },
    openGraph: {
      url: `/content/${slug}`,
      title: article.title,
      images: article.thumbnailUrl ? [{ url: article.thumbnailUrl, alt: article.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      images: article.thumbnailUrl ? [article.thumbnailUrl] : undefined,
    },
  };
}

export default async function ContentDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const typeLabel = getArticleTypeLabel(article.type);

  return (
    <main className="min-h-screen py-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/content">← 콘텐츠 목록</Link>
        </Button>
      </div>
      <article className="space-y-4">
        <span className="text-sm text-muted-foreground">{typeLabel}</span>
        <h1 className="text-2xl font-semibold">{article.title}</h1>
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
          <Image
            src={article.thumbnailUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
          />
        </div>
        <MarkdownContent content={article.content} />
      </article>
    </main>
  );
}
