import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BookOpen, CalendarDays, PlayCircle } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';
import { getPublishedYoutubeContentsList } from '@/lib/youtube-store';
import StoreFooter from '@/components/home/StoreFooter';
import ConcertPurchasePanel from '@/components/concerts/ConcertPurchasePanel';
import YoutubeContentCard from '@/components/content/YoutubeContentCard';

export const revalidate = 300;

export const metadata: Metadata = {
  title: '북콘서트',
  alternates: { canonical: '/concerts' },
  openGraph: { url: '/concerts', title: '북콘서트' },
};

interface ConcertView {
  id: string;
  title: string;
  archiveTitle: string;
  slug: string;
  bookIsbns: string[];
  imageUrl: string;
  bookingUrl: string;
  feeLabel: string;
  feeNote: string;
  hostNote: string;
  statusBadge: string;
  ticketPrice: number;
  ticketOpen: boolean;
  date: string | null;
  reviewYoutubeIds: string[];
  description: string;
  featuredBook?: { title: string; author: string; description: string; coverImage: string } | null;
}

interface FeaturedBookPreview {
  title: string | null;
  author: string | null;
  description: string | null;
  cover_image: string | null;
}

function parsePriceLabel(label: string): number {
  const digits = label.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function parseDateValue(date: string | null) {
  if (!date) return null;
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? null : value;
}

function formatConcertDate(date: string | null) {
  const value = parseDateValue(date);
  if (!value) return '일정 추후 공개';
  return value.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function firstSentence(text: string | null | undefined) {
  const normalized = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  const match = normalized.match(/^(.+?[.!?])(\s|$)/);
  const sentence = (match?.[1] ?? normalized).trim();
  return `${sentence} ...`;
}

async function getConcertData() {
  const { data, error } = await supabaseAdmin
    .from('concerts')
    .select('*')
    .eq('is_visible', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[concerts/page] failed to fetch concerts:', error);
    return [];
  }

  const mapped = (data ?? []).map(mapConcertRow);
  const active = mapped.filter((concert) => concert.status !== 'ended');

  const isEmpty = active.length === 0;
  if (isEmpty) return [];

  const featuredBookIsbns = Array.from(
    new Set(
      active
        .flatMap((concert) => concert.bookIsbns)
        .filter((isbn): isbn is string => typeof isbn === 'string' && isbn.trim().length > 0)
    )
  );

  let featuredBooks = new Map<string, FeaturedBookPreview>();

  if (featuredBookIsbns.length > 0) {
    const { data: bookRows, error: bookError } = await supabaseAdmin
      .from('books')
      .select('isbn, title, author, description, cover_image')
      .in('isbn', featuredBookIsbns);

    if (bookError) {
      console.error('[concerts/page] failed to fetch featured books:', bookError);
    } else {
      featuredBooks = new Map(
        (bookRows ?? []).map((book) => [
          book.isbn,
          {
            title: book.title ?? null,
            author: book.author ?? null,
            description: book.description ?? null,
            cover_image: book.cover_image ?? null,
          },
        ])
      );
    }
  }

  return active.map((concert) => {
    const featuredBook = concert.bookIsbns
      .map((isbn) => {
        const book = featuredBooks.get(isbn);
        if (!book) return null;
        return {
          title: book.title ?? '추천 도서',
          author: book.author ?? '저자 미상',
          description: firstSentence(book.description),
          coverImage: book.cover_image ?? '',
        };
      })
      .find(Boolean) ?? null;

    return {
      id: concert.id,
      title: concert.title,
      archiveTitle: concert.title,
      slug: concert.slug,
      bookIsbns: concert.bookIsbns,
      imageUrl: concert.imageUrl,
      bookingUrl: concert.bookingUrl,
      feeLabel: concert.feeLabel,
      feeNote: concert.feeNote,
      hostNote: concert.hostNote,
      statusBadge: concert.statusBadge,
      ticketPrice: parsePriceLabel(concert.feeLabel),
      ticketOpen: concert.status === 'upcoming',
      date: concert.date,
      reviewYoutubeIds: concert.reviewYoutubeIds,
      description: concert.description,
      featuredBook,
    } satisfies ConcertView;
  });
}

export default async function ConcertsPage() {
  const concerts = await getConcertData();
  if (concerts.length === 0) notFound();

  const latestConcert = concerts[0];
  const reviewVideos = latestConcert.reviewYoutubeIds.length > 0
    ? await getPublishedYoutubeContentsList('youtube')
        .then((items) => items.filter((item) => latestConcert.reviewYoutubeIds.includes(item.youtubeId ?? '')))
        .catch(() => [])
    : [];

  return (
    <>
      <main className="min-h-screen bg-[#f6f1ea]">
        <section className="relative overflow-hidden border-b border-[#e6d9ca] bg-[#f8f1e7]">
          <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:py-16">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#cbb59f] bg-white/80 px-4 py-2 text-xs font-semibold tracking-[0.28em] text-[#7b4b2a] uppercase">
                <BookOpen className="size-3.5" />
                Book Concert
              </div>
              <div className="space-y-4">
                <h1 className="font-myeongjo text-4xl font-semibold leading-tight text-[#2d1a10] md:text-6xl">
                  책과 대화가 함께하는
                  <br />
                  미옥서원 북콘서트
                </h1>
                <p className="max-w-2xl text-[15px] leading-7 text-[#5f4838] md:text-[17px]">
                  저자와 독자가 한 공간에서 만나고, 책의 맥락을 더 깊게 나누는 프로그램입니다. 현재 진행 중인 북콘서트와 다시보기 콘텐츠를 함께 확인하세요.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#5f4838]">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                  <CalendarDays className="size-4 text-[#7b4b2a]" />
                  <span>{formatConcertDate(latestConcert.date)}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                  <PlayCircle className="size-4 text-[#7b4b2a]" />
                  <span>후기 영상 {reviewVideos.length}개</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[32px] border border-[#d8c3af] bg-white shadow-[0_24px_80px_-48px_rgba(55,28,17,0.55)]">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={latestConcert.imageUrl}
                  alt={latestConcert.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 md:grid-cols-[minmax(0,1fr)_380px] md:px-8 md:py-14">
          <div className="space-y-8">
            {concerts.map((concert) => (
              <article
                key={concert.id}
                className="overflow-hidden rounded-[28px] border border-[#dfd1c2] bg-white shadow-[0_20px_70px_-50px_rgba(46,23,11,0.6)]"
              >
                <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="relative min-h-[320px]">
                    <Image
                      src={concert.imageUrl}
                      alt={concert.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 540px"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-6 p-6 md:p-8">
                    <div className="space-y-3">
                      <div className="inline-flex rounded-full bg-[#f2e6d9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#7b4b2a]">
                        {concert.statusBadge}
                      </div>
                      <div>
                        <h2 className="font-myeongjo text-3xl font-semibold leading-tight text-[#24160f]">
                          {concert.title}
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-[#5f4838]">{concert.description}</p>
                      </div>
                    </div>

                    {concert.featuredBook ? (
                      <div className="rounded-2xl border border-[#eadfd3] bg-[#fcf7f2] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9d7455]">Featured Book</p>
                        <div className="mt-3 flex gap-4">
                          <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-lg border border-[#e2d1c2] bg-white">
                            {concert.featuredBook.coverImage ? (
                              <Image
                                src={concert.featuredBook.coverImage}
                                alt={concert.featuredBook.title}
                                fill
                                sizes="72px"
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#2b1a12]">{concert.featuredBook.title}</p>
                            <p className="mt-1 text-sm text-[#7b5f4e]">{concert.featuredBook.author}</p>
                            <p className="mt-2 text-sm leading-6 text-[#5f4838]">{concert.featuredBook.description}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-[#f8f2eb] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7455]">일정</p>
                        <p className="mt-2 text-sm font-medium text-[#2c1d15]">{formatConcertDate(concert.date)}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f8f2eb] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7455]">참가비</p>
                        <p className="mt-2 text-sm font-medium text-[#2c1d15]">{concert.feeLabel || '무료'}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f8f2eb] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7455]">주최</p>
                        <p className="mt-2 text-sm font-medium text-[#2c1d15]">{concert.hostNote || '미옥서원'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/concerts/${concert.slug}`}
                        className="inline-flex items-center justify-center rounded-full bg-[#2d1a10] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2c1c]"
                      >
                        자세히 보기
                      </Link>
                      {concert.bookingUrl ? (
                        <ConcertPurchasePanel
                          title={concert.title}
                          bookingUrl={concert.bookingUrl}
                          isOpen={concert.ticketOpen}
                          ticketPrice={concert.ticketPrice}
                          feeNote={concert.feeNote}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-[#dfd1c2] bg-white p-6 shadow-[0_20px_70px_-50px_rgba(46,23,11,0.6)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9d7455]">Review Videos</p>
              <h2 className="mt-3 font-myeongjo text-2xl font-semibold text-[#24160f]">북콘서트 다시보기</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f4838]">
                북콘서트 현장을 영상으로 다시 보고, 다음 프로그램 참여 여부를 미리 살펴보세요.
              </p>
            </div>

            <div className="space-y-4">
              {reviewVideos.map((item) => (
                <YoutubeContentCard key={item.id} item={item} />
              ))}
            </div>
          </aside>
        </section>
      </main>
      <StoreFooter />
    </>
  );
}
