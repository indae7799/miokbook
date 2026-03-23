import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Play } from 'lucide-react';
import type { YoutubeContentListItem } from '@/lib/youtube-store';

export interface YoutubeContentCardProps {
  item: YoutubeContentListItem;
}

function summarize(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '미옥서원 북콘서트 후기 영상을 확인해 보세요.';
  return cleaned.length > 92 ? `${cleaned.slice(0, 92)}...` : cleaned;
}

export default function YoutubeContentCard({ item }: YoutubeContentCardProps) {
  return (
    <article className="group overflow-hidden border border-[#722f37]/14 bg-white transition-colors hover:border-[#722f37]/28">
      <Link href={`/content/video/${item.slug}`} className="block">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#ede4dd]">
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              unoptimized={item.thumbnailUrl.includes('ytimg.com')}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground">
              썸네일이 없습니다
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute left-4 top-4 inline-flex bg-[#722f37] px-3 py-1 text-[11px] font-semibold text-white">
            북콘서트 영상
          </div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
            <div className="flex size-10 items-center justify-center bg-white text-[#722f37]">
              <Play className="ml-0.5 size-4 fill-current" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Watch</p>
              <p className="text-sm font-medium">영상 상세보기</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="inline-flex border border-[#722f37]/14 bg-[#f8f1f2] px-2.5 py-1 text-[11px] font-semibold text-[#722f37]">
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
