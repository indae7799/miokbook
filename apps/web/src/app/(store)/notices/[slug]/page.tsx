import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import MarkdownContent from '@/components/content/MarkdownContent';
import { getNoticeBySlug } from '@/lib/articles';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('ko-KR');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const notice = await getNoticeBySlug(slug);
  if (!notice) return { title: '공지사항' };

  return {
    title: `${notice.title} | 공지사항`,
    openGraph: {
      title: notice.title,
      images: notice.thumbnailUrl ? [{ url: notice.thumbnailUrl, alt: notice.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: notice.title,
      images: notice.thumbnailUrl ? [notice.thumbnailUrl] : undefined,
    },
  };
}

export default async function NoticeDetailPage({ params }: Props) {
  const { slug } = await params;
  const notice = await getNoticeBySlug(slug);
  if (!notice) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8f5ef] via-background to-background py-6 sm:py-10">
      <article className="mx-auto max-w-4xl px-4 sm:px-6">
        <Link
          href="/notices"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          공지사항 목록
        </Link>

        <header className="mt-4 rounded-[28px] border border-[#2f241f]/10 bg-white/95 px-6 py-8 shadow-[0_24px_60px_-42px_rgba(36,24,21,0.22)] sm:px-8 sm:py-10">
          <span className="inline-flex rounded-full bg-[#f6efe5] px-3 py-1 text-[11px] font-semibold text-[#8d6e5a]">
            공지사항
          </span>
          <h1 className="mt-4 font-myeongjo text-2xl font-semibold leading-tight text-[#201714] sm:text-[34px]">
            {notice.title}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            업데이트 {formatDate(notice.updatedAt ?? notice.createdAt)}
          </p>
        </header>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-[#2f241f]/10 bg-white shadow-[0_20px_50px_-40px_rgba(36,24,21,0.18)]">
          {notice.thumbnailUrl ? (
            <div className="relative aspect-[16/8] w-full bg-muted">
              <Image
                src={notice.thumbnailUrl}
                alt={notice.title}
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
            </div>
          ) : null}

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <MarkdownContent content={notice.content} className="leading-8" />
          </div>
        </div>
      </article>
    </main>
  );
}
