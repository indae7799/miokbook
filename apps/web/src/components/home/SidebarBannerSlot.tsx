import Image from 'next/image';
import SmartLink from '@/components/common/SmartLink';
import { cmsImageUnoptimized } from '@/lib/cms-image';

interface SidebarBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
}

export default function SidebarBannerSlot({
  banners,
  square = false,
}: {
  banners: SidebarBanner[];
  /** true면 정사각형(홈 2단 영역용) */
  square?: boolean;
}) {
  const validBanners = banners.filter((b) => b.imageUrl?.trim());
  if (validBanners.length === 0) return null;

  const aspectClass = square ? 'aspect-square' : 'aspect-[3/4]';

  return (
    <aside
      className="flex flex-row gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:space-x-0 lg:space-y-3"
      aria-label="사이드 배너"
    >
      {validBanners.map((b) => (
        <SmartLink
          key={b.id}
          href={b.linkUrl}
          className={`block relative w-[180px] ${aspectClass} shrink-0 rounded-lg overflow-hidden bg-muted lg:w-full lg:max-w-[300px]`}
        >
          <Image
            src={b.imageUrl}
            alt=""
            fill
            sizes="(max-width: 1024px) 180px, 300px"
            className="object-cover"
            unoptimized={cmsImageUnoptimized(b.imageUrl)}
          />
        </SmartLink>
      ))}
    </aside>
  );
}
