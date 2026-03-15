'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import Image from 'next/image';
import SmartLink from '@/components/common/SmartLink';

export interface HeroBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
}

export interface HeroCarouselProps {
  banners: HeroBanner[];
}

export default function HeroCarousel({ banners }: HeroCarouselProps) {
  if (banners.length === 0) return null;

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
