import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Play } from 'lucide-react';
import type { YoutubeContentListItem } from '@/lib/youtube-store';

export interface YoutubeContentCardProps {
  item: YoutubeContentListItem;
}

function summarize(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '책과 사람, 취향을 연결하는 미옥서원 영상 큐레이션을 만나보세요.';
  return cleaned.length > 92 ? `${cleaned.slice(0, 92)}...` : cleaned;
}

export default function YoutubeContentCard({ item }: YoutubeContentCardProps) {
  return (
    <article className="group overflow-hidden rounded-[24px] border border-[#722f37]/10 bg-[linear-gradient(180deg,#fff_0%,#fff8f4_100%)] shadow-[0_18px_40px_rgba(114,47,55,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(114,47,55,0.12)]">
      <Link href={`/content/video/${item.slug}`} className="block">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#eadfd6]">
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              unoptimized={item.thumbnailUrl.includes('ytimg.com')}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground">
              썸네일이 없습니다
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute left-4 top-4 inline-flex rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#722f37] shadow-sm">
            Video Curation
          </div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
            <div className="flex size-11 items-center justify-center rounded-full bg-white text-[#722f37] shadow-lg">
              <Play className="ml-0.5 size-4 fill-current" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Watch now</p>
              <p className="text-sm font-medium">영상 상세로 이동</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="inline-flex rounded-full border border-[#722f37]/10 bg-[#722f37]/6 px-2.5 py-1 text-[11px] font-semibold text-[#722f37]">
            미옥서원 추천 영상
          </div>
          <h3 className="line-clamp-2 text-lg font-semibold leading-7 tracking-tight text-foreground">
            {item.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {summarize(item.description)}
          </p>
          <div className="inline-flex items-center gap-1 text-sm font-medium text-[#722f37]">
            자세히 보기 <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </article>
  );
}
