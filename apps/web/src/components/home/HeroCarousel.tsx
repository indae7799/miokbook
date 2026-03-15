'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import Image from 'next/image';
import SmartLink from '@/components/common/SmartLink';
import Link from 'next/link';

export interface HeroBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
}

export interface HeroCarouselProps {
  banners: HeroBanner[];
}

/** 배너가 없을 때 홈 상단에 보이는 플레이스홀더 (MVP 첫 설정 유도) */
function HeroPlaceholder() {
  return (
    <section className="w-full rounded-lg overflow-hidden bg-muted border border-border">
      <div className="relative aspect-[21/9] min-h-[120px] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-lg font-medium text-muted-foreground">메인 배너 영역</p>
          <p className="text-sm text-muted-foreground mt-1">
            관리자 페이지에서 배너를 추가하면 여기에 노출됩니다.
          </p>
          <Link
            href="/admin/marketing"
            className="inline-block mt-3 text-sm font-medium text-primary hover:underline"
          >
            배너 추가하기 (관리자 → 배너/팝업)
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HeroCarousel({ banners }: HeroCarouselProps) {
  if (banners.length === 0) return <HeroPlaceholder />;

  return (
    <section className="w-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        className="rounded-lg overflow-hidden"
      >
        {banners.map((b) => (
          <SwiperSlide key={b.id}>
            <SmartLink href={b.linkUrl} className="block relative aspect-[21/9] w-full bg-muted min-h-[120px]">
              <Image
                src={b.imageUrl}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            </SmartLink>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
