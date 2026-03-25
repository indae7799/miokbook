import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft, CalendarDays, Paperclip } from 'lucide-react';
import MarkdownContent from '@/components/content/MarkdownContent';
import { supabaseAdmin } from '@/lib/supabase/admin';

// 캐시 우회: 매 요청마다 DB 직접 조회
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}년 ${m}월 ${d}일`;
}

function hasAttachment(content: string) {
  return /\[📎/.test(content);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const { data } = await supabaseAdmin
    .from('articles')
    .select('title')
    .eq('slug', decodedSlug)
    .eq('type', 'notice')
    .eq('is_published', true)
    .maybeSingle();

  if (!data) return { title: '공지사항' };
  return {
    title: `${data.title} | 공지사항`,
    openGraph: { title: data.title },
    twitter: { card: 'summary', title: data.title },
  };
}

export default async function NoticeDetailPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const { data: notice, error } = await supabaseAdmin
    .from('articles')
    .select('article_id, slug, title, content, created_at, updated_at')
    .eq('slug', decodedSlug)
    .eq('type', 'notice')
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    console.error('[notices/[slug]] DB error:', error);
  }

  if (!notice) notFound();

  const showAttachmentBadge = hasAttachment(notice.content ?? '');

  return (
    <main className="min-h-screen bg-[#faf8f4] py-10 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">

        {/* 뒤로가기 */}
        <Link
          href="/notices"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-[#9c7c65] transition-colors hover:bg-[#f0e8dc] hover:text-[#5f3a28] -ml-3"
        >
          <ChevronLeft className="size-4" />
          공지사항 목록
        </Link>

        <article className="mt-5 overflow-hidden rounded-2xl border border-[#e8e0d6] bg-white shadow-sm">

          {/* 헤더 */}
          <div className="border-b border-[#f0ebe3] bg-[#fdf9f4] px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#722f37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#722f37]">
                공지사항
              </span>
              {showAttachmentBadge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f0e8] px-2.5 py-1 text-[11px] font-medium text-[#9c7c65]">
                  <Paperclip className="size-3" />
                  첨부파일 있음
                </span>
              )}
            </div>
            <h1 className="mt-4 font-myeongjo text-[22px] font-semibold leading-snug text-[#1e1612] sm:text-[28px] sm:leading-tight">
              {notice.title}
            </h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-[#9c7c65]">
              <CalendarDays className="size-4 shrink-0" />
              <span>{formatDate(notice.updated_at ?? notice.created_at)}</span>
            </div>
          </div>

          {/* 본문 */}
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            {notice.content ? (
              <MarkdownContent
                content={notice.content}
                className="text-[15px] leading-8 text-[#2e211a]"
              />
            ) : (
              <p className="text-sm text-[#9c7c65]">내용이 없습니다.</p>
            )}
          </div>

          {/* 하단 */}
          <div className="border-t border-[#f0ebe3] bg-[#fdf9f4] px-6 py-4 sm:px-8">
            <Link
              href="/notices"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9c7c65] transition-colors hover:text-[#5f3a28]"
            >
              <ChevronLeft className="size-4" />
              목록으로 돌아가기
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
