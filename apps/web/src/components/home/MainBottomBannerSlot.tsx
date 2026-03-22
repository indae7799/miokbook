import Link from 'next/link';
import Image from 'next/image';
import type { MainBottomBanner } from '@/lib/store/home';

function BannerPlaceholder({ label }: { label: string }) {
  return (
    <div className="relative block aspect-[60/19] overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted">
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Link href="/admin/marketing" className="mt-1 text-xs text-primary hover:underline">
          배너 추가하기
        </Link>
      </div>
    </div>
  );
}

/** CMS 메인 하단 좌·우 배너 — RSC로 홈 푸터 직전에도 그대로 사용 */
export function MainBottomBannerSlot({
  banner,
  emptyLabel,
}: {
  banner: MainBottomBanner | null | undefined;
  emptyLabel: string;
}) {
  if (banner?.imageUrl?.trim()) {
    return (
      <Link
        href={banner.linkUrl}
        className="relative block aspect-[60/19] overflow-hidden rounded-lg bg-muted"
      >
        <Image
          src={banner.imageUrl}
          alt=""
          fill
          sizes="(max-width:1024px) 100vw, 50vw"
          className="object-cover"
        />
      </Link>
    );
  }
  return <BannerPlaceholder label={emptyLabel} />;
}
