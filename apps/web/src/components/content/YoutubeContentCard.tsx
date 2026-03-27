import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import type { YoutubeContentListItem } from '@/lib/youtube-store';
import { YoutubePlayTapArea } from '@/components/content/youtube-style-play';

export interface YoutubeContentCardProps {
  item: YoutubeContentListItem;
}

function summarize(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '미옥서원 북콘서트 영상의 자세한 내용을 확인해 보세요.';
  return cleaned.length > 84 ? `${cleaned.slice(0, 84)}...` : cleaned;
}

export default function YoutubeContentCard({ item }: YoutubeContentCardProps) {
  const detailHref = `/content/video/${item.slug}`;

  return (
    <article className="group overflow-hidden rounded-[18px] border border-[#722f37]/14 bg-white transition-colors hover:border-[#722f37]/28">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#ede4dd]">
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
        <div className="absolute left-3 top-3 inline-flex rounded-full bg-[#722f37] px-2.5 py-1 text-[10px] font-semibold text-white">
          북콘서트 영상
        </div>
        <YoutubePlayTapArea label={`${item.title} 자세히 보기`} href={detailHref} />
      </div>

      <div className="space-y-3 p-4">
        <div className="inline-flex rounded-full border border-[#722f37]/14 bg-[#f8f1f2] px-2.5 py-1 text-[10px] font-semibold text-[#722f37]">
          미옥서원 추천 영상
        </div>
        <Link href={detailHref} className="block">
          <h3 className="line-clamp-2 text-[17px] font-semibold leading-6 tracking-tight text-foreground hover:underline">
            {item.title}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {summarize(item.description)}
        </p>
        <Link href={detailHref} className="inline-flex items-center gap-1 text-sm font-medium text-[#722f37]">
          자세히 보기 <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
