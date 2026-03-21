import Link from 'next/link';
import Image from 'next/image';
import type { YoutubeContentListItem } from '@/lib/youtube-store';

export interface YoutubeContentCardProps {
  item: YoutubeContentListItem;
}

export default function YoutubeContentCard({ item }: YoutubeContentCardProps) {
  return (
    <article className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <Link href={`/content/video/${item.slug}`} className="block relative aspect-video w-full bg-muted">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className="object-cover"
            unoptimized={item.thumbnailUrl.includes('ytimg.com')}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground">
            썸네일 없음
            <span className="sr-only"> — {item.title}</span>
          </span>
        )}
      </Link>
      <div className="p-3 flex-1 flex flex-col min-h-[48px] justify-center">
        <span className="text-xs text-muted-foreground">영상</span>
        <Link
          href={`/content/video/${item.slug}`}
          className="font-medium text-sm mt-0.5 hover:underline line-clamp-2"
        >
          {item.title}
        </Link>
      </div>
    </article>
  );
}
