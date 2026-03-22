import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, Pin } from 'lucide-react';
import { getNoticesList } from '@/lib/articles';

export const revalidate = 300;

export const metadata: Metadata = {
  title: '공지사항',
  description: '미옥서원의 최신 공지사항을 확인하세요.',
};

function formatDate(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('ko-KR');
}

export default async function NoticesPage() {
  const notices = await getNoticesList();
  const featuredNotice = notices[0] ?? null;
  const listNotices = featuredNotice ? notices.slice(1) : notices;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8f5ef] via-background to-background py-8 sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <header className="border-b border-[#2f241f]/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6e5a]">Notice</p>
          <h1 className="mt-3 font-myeongjo text-3xl font-semibold tracking-tight text-[#201714] sm:text-[38px]">
            공지사항
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#62514a] sm:text-[15px]">
            운영 안내, 일정 변경, 이벤트 소식 등 미옥서원의 중요한 소식을 확인하실 수 있습니다.
          </p>
        </header>

        {featuredNotice ? (
          <section className="mt-8 rounded-[24px] border border-[#2f241f]/10 bg-white px-6 py-6 shadow-[0_22px_44px_-38px_rgba(36,24,21,0.25)] sm:px-8">
            <div className="flex items-center gap-2 text-[#8d6e5a]">
              <Pin className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Latest Notice</span>
            </div>
            <Link href={`/notices/${featuredNotice.slug}`} className="group mt-4 block">
              <h2 className="text-xl font-semibold leading-8 text-[#201714] transition-colors group-hover:text-primary sm:text-2xl">
                {featuredNotice.title}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {formatDate(featuredNotice.updatedAt ?? featuredNotice.createdAt)}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                자세히 보기
                <ChevronRight className="size-4" />
              </div>
            </Link>
          </section>
        ) : null}

        <section className="mt-8 overflow-hidden rounded-[24px] border border-[#2f241f]/10 bg-white">
          {notices.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              등록된 공지사항이 없습니다.
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#2f241f]/10 bg-[#fcfaf6] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8d6e5a] sm:px-8">
                <span>제목</span>
                <span>날짜</span>
              </div>
              <ul>
                {(listNotices.length > 0 ? listNotices : featuredNotice ? [featuredNotice] : []).map((notice) => (
                  <li key={notice.articleId} className="border-b border-[#2f241f]/10 last:border-b-0">
                    <Link
                      href={`/notices/${notice.slug}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#fcfaf6] sm:px-8"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-[#201714] sm:text-base">
                          {notice.title}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {formatDate(notice.updatedAt ?? notice.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
