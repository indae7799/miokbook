import Image from 'next/image';
import SmartLink from '@/components/common/SmartLink';
import { cmsImageUnoptimized } from '@/lib/cms-image';

interface TopBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
}

export default function TopBannerStrip({ banners }: { banners: TopBanner[] }) {
  const validBanners = banners.filter((b) => b.imageUrl?.trim());
  if (validBanners.length === 0) return null;

  if (validBanners.length === 1) {
    const b = validBanners[0];
    return (
      <section className="w-full">
        <SmartLink href={b.linkUrl} className="block relative w-full aspect-[4/1] rounded-lg overflow-hidden bg-muted">
          <Image
            src={b.imageUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            unoptimized={cmsImageUnoptimized(b.imageUrl)}
          />
        </SmartLink>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {validBanners.map((b) => (
          <SmartLink
            key={b.id}
            href={b.linkUrl}
            className="block relative shrink-0 w-[80%] sm:w-[48%] aspect-[4/1] rounded-lg overflow-hidden bg-muted"
          >
            <Image
              src={b.imageUrl}
              alt=""
              fill
              sizes="(max-width:640px) 80vw, 48vw"
              className="object-cover"
              unoptimized={cmsImageUnoptimized(b.imageUrl)}
            />
          </SmartLink>
        ))}
      </div>
    </section>
  );
}
