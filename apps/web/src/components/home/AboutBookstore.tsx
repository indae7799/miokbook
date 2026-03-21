'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cmsPreferNativeImg } from '@/lib/cms-image';

export interface AboutBookstoreProps {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
}

export default function AboutBookstore({
  title = '대량 구매 서비스',
  description = '단체 도서 구매를 온라인으로 간편하게. 견적부터 배송까지 한번에!',
  ctaLabel = '견적 문의하기',
  ctaHref = '/guest-order',
  imageUrl = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2400',
}: AboutBookstoreProps) {
  return (
    <section className="relative w-full max-w-none overflow-hidden h-[200px] rounded-none border-y border-border shadow-md">
      {imageUrl && (
        <>
          {cmsPreferNativeImg(imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="대량 구매 서비스 배경"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <Image
              src={imageUrl}
              alt="대량 구매 서비스 배경"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
          )}
          <div className="absolute inset-0 z-[1] bg-black/40" />
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        </>
      )}

      <div className="relative z-10 flex h-full items-center justify-center px-6 md:px-12 text-center">
        <div className="max-w-3xl space-y-3">
          <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-xl">
            {title}
          </h2>
          <p className="text-xs md:text-base font-medium text-white/90 leading-relaxed drop-shadow">
            {description}
          </p>
          <Button
            asChild
            className="mt-2 min-h-[42px] px-6 rounded-full font-semibold bg-white text-black hover:bg-white/90 transition-all duration-300 shadow-lg"
          >
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
