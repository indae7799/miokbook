import Image from 'next/image';
import Link from 'next/link';
import SmartLink from '@/components/common/SmartLink';

export interface StoreHeroImage {
  imageUrl: string;
  linkUrl: string;
}

export interface StoreHeroProps {
  /** 서점 이미지 (CMS 서점 이미지 슬롯). 없으면 플레이스홀더, 영역은 항상 확보 */
  storeHero: StoreHeroImage | null;
}

const STORE_HERO_MAX_WIDTH = 1200;
const STORE_HERO_ASPECT = 21 / 9;
const STORE_HERO_MIN_HEIGHT = 140;

export default function StoreHero({ storeHero }: StoreHeroProps) {
  const hasImage = storeHero?.imageUrl?.trim();

  return (
    <section className="w-full flex justify-center px-4" aria-label="서점 대문 이미지">
      <div
        className="w-full rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center shadow-[0_6px_28px_rgba(0,0,0,0.14)]"
        style={{
          maxWidth: STORE_HERO_MAX_WIDTH,
          aspectRatio: hasImage ? STORE_HERO_ASPECT : undefined,
          minHeight: STORE_HERO_MIN_HEIGHT,
        }}
      >
        {!hasImage ? (
          <div className="text-center px-4 py-8">
            <p className="text-lg font-medium text-muted-foreground">서점 이미지</p>
            <p className="text-sm text-muted-foreground mt-1">관리자 → 배너/팝업에서 &apos;서점 이미지 (탭 위 대문)&apos;을 설정하면 여기에 노출됩니다.</p>
            <Link href="/admin/marketing" className="inline-block mt-3 text-sm font-medium text-primary hover:underline">
              서점 이미지 설정하기
            </Link>
          </div>
        ) : (
          <SmartLink
            href={storeHero!.linkUrl || '#'}
            className="block relative w-full h-full min-h-[140px] rounded-lg overflow-hidden aspect-[21/9]"
          >
            <Image
              src={storeHero!.imageUrl}
              alt="서점"
              fill
              sizes="(max-width: 1248px) 100vw, 1200px"
              className="object-cover object-center"
              priority
            />
          </SmartLink>
        )}
      </div>
    </section>
  );
}
