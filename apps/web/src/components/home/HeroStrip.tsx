import Link from 'next/link';

interface HeroStripProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
}

/**
 * 헤더 바로 아래 전폭 대문 — CMS 이미지 + 문구(제목·부제) 오버레이.
 * 이미지 없을 때는 안내 또는 텍스트만 표시.
 */
export default function HeroStrip({
  title,
  subtitle,
  imageUrl,
  linkUrl = '/',
}: HeroStripProps) {
  const hasImage = Boolean(imageUrl?.trim());

  if (!hasImage) {
    return (
      <section className="relative flex w-full min-h-[200px] items-center justify-center overflow-hidden border-b border-border bg-[#f8f6f2] px-4 py-12 sm:min-h-[280px]">
        <div className="mx-auto max-w-[1400px] text-center">
          <p className="text-lg font-medium text-muted-foreground">서점 대문 이미지</p>
          <p className="mt-1 text-sm text-muted-foreground">
            관리자 → 배너/팝업에서 &apos;서점 이미지 (탭 위 대문)&apos;을 설정하면 여기에 노출됩니다.
          </p>
          <Link href="/admin/marketing" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            서점 이미지 설정하기
          </Link>
        </div>
      </section>
    );
  }

  const doorSrc = imageUrl!.trim();
  /** cover = 좌우·상하 여백 없이 영역 채움(비율 유지, 넘치는 부분만 크롭) */
  const doorBg = `url(${JSON.stringify(doorSrc)})`;

  return (
    <section className="relative isolate w-full h-[200px] overflow-hidden border-b border-border bg-[#f8f6f2] sm:h-[320px] md:h-[560px]">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[#e8e6e2] bg-cover bg-no-repeat"
        style={{
          backgroundImage: doorBg,
          backgroundPosition: 'center 65%',
        }}
        aria-hidden
      />
      <div className="absolute inset-0 z-[1] bg-black/40" />
      {(title || subtitle) ? (
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      ) : null}

      <Link
        href={linkUrl}
        className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 transition-opacity hover:opacity-95 sm:px-8 md:px-16"
      >
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center text-center">
          <div className="max-w-4xl space-y-3 md:space-y-6">
            {title ? (
              <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-lg sm:text-3xl md:text-7xl">
                {title}
              </h2>
            ) : null}
            <div className="flex flex-col items-center gap-4 md:gap-6">
              {subtitle ? (
                <p className="text-sm font-light uppercase tracking-[0.15em] text-white/90 drop-shadow-md sm:text-base sm:tracking-[0.2em] md:text-2xl md:tracking-[0.2em]">
                  {subtitle}
                </p>
              ) : null}
              {(title || subtitle) ? <div className="mt-2 h-px w-12 bg-white/50 md:w-24" /> : null}
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
