import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft, ChevronRight, Paperclip } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '공지사항',
  description: '미옥서원의 최신 공지사항을 확인하세요.',
};

const PAGE_SIZE = 10;

interface Props {
  searchParams?: Promise<{ page?: string }>;
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function buildPageHref(page: number) {
  return page <= 1 ? '/notices' : `/notices?page=${page}`;
}

function hasAttachment(content?: string | null) {
  return typeof content === 'string' && /!\[.*?\]\(/.test(content);
}

export default async function NoticesPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const currentPage = Math.max(1, Number(params.page ?? '1') || 1);

  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('article_id, slug, title, content, created_at, updated_at')
    .eq('type', 'notice')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[notices/page] DB error:', error);
  }

  const notices = data ?? [];
  const totalCount = notices.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pagedNotices = notices.slice(start, start + PAGE_SIZE);

  return (
    <main className="min-h-screen bg-[#faf8f4] py-10 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <header className="pb-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9c7c65]">Notice</p>
          <h1 className="font-myeongjo text-[28px] font-semibold tracking-tight text-[#1e1612] sm:text-[36px]">
            공지사항
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#6b5448]">
            운영 안내, 변경 사항 등 최신 공지를 확인할 수 있습니다.
          </p>
        </header>

        <div className="border-t border-[#d9cec1]" />

        <section className="mt-6">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 border-b border-[#ded4c8] bg-[#f5f0e8] px-4 py-3 sm:px-6">
            <span className="w-10 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9c7c65]">No.</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9c7c65]">제목</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9c7c65]">날짜</span>
          </div>

          {totalCount === 0 ? (
            <div className="border-b border-[#ece3d8] px-4 py-20 text-center sm:px-6">
              <p className="text-[15px] text-[#9c7c65]">등록된 공지사항이 없습니다.</p>
            </div>
          ) : (
            <ul className="border-b border-[#ece3d8]">
              {pagedNotices.map((notice, index) => {
                const rowNumber = totalCount - start - index;
                return (
                  <li key={notice.article_id} className="border-t border-[#f1e8de] first:border-t-0">
                    <Link
                      href={`/notices/${encodeURIComponent(notice.slug)}`}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-4 py-4 transition-colors hover:bg-[#f8f3ec] sm:px-6"
                    >
                      <span className="w-10 text-center text-[13px] tabular-nums text-[#b49d8a]">
                        {rowNumber}
                      </span>
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="min-w-0 truncate text-[15px] font-medium leading-snug text-[#1e1612] sm:text-[16px]">
                          {notice.title}
                        </p>
                        {hasAttachment(notice.content) ? (
                          <Paperclip className="size-3.5 shrink-0 text-[#b39982]" />
                        ) : null}
                      </div>
                      <span className="shrink-0 text-[13px] tabular-nums text-[#a89282]">
                        {formatDate(notice.updated_at ?? notice.created_at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {totalCount > 0 ? (
          <p className="mt-4 text-right text-xs text-[#b39982]">총 {totalCount}건</p>
        ) : null}

        {totalPages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-1.5">
            <Link
              href={buildPageHref(safePage - 1)}
              aria-disabled={safePage <= 1}
              className={`inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-sm transition-colors ${
                safePage <= 1
                  ? 'pointer-events-none border-[#e8e0d6] text-[#c4b8ae]'
                  : 'border-[#e8e0d6] bg-white text-[#4a3728] hover:border-[#c4a882] hover:bg-[#fdf9f4]'
              }`}
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">이전</span>
            </Link>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  href={buildPageHref(page)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-medium transition-colors ${
                    page === safePage
                      ? 'border-[#722f37] bg-[#722f37] text-white'
                      : 'border-[#e8e0d6] bg-white text-[#4a3728] hover:border-[#c4a882] hover:bg-[#fdf9f4]'
                  }`}
                >
                  {page}
                </Link>
              ))}
            </div>

            <Link
              href={buildPageHref(safePage + 1)}
              aria-disabled={safePage >= totalPages}
              className={`inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-sm transition-colors ${
                safePage >= totalPages
                  ? 'pointer-events-none border-[#e8e0d6] text-[#c4b8ae]'
                  : 'border-[#e8e0d6] bg-white text-[#4a3728] hover:border-[#c4a882] hover:bg-[#fdf9f4]'
              }`}
            >
              <span className="hidden sm:inline">다음</span>
              <ChevronRight className="size-4" />
            </Link>
          </nav>
        ) : null}
      </div>
    </main>
  );
}
