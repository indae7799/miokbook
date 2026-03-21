import Link from 'next/link';

const MSG =
  '지금은 이 목록을 불러오지 못하고 있습니다. (일시적인 데이터 이용 한도 등) 아래 링크에서 전체 도서를 둘러보실 수 있습니다.';

export default function HomeSectionFallback({
  title,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="space-y-5 w-full min-w-0 flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[1400px] gap-3">
        <h2 className="flex min-w-0 items-start gap-3 text-[28px] font-semibold leading-tight">
          <span
            className="home-section-title-bar mt-[0.08em] h-[1.25em] w-1.5 shrink-0 self-start md:w-2"
            aria-hidden
          />
          {title}
        </h2>
      </div>
      <div className="w-full max-w-[1400px] mx-auto rounded-xl border border-amber-200/90 bg-amber-50 dark:bg-amber-950/25 dark:border-amber-800/50 px-5 py-8 text-center space-y-4">
        <p className="text-sm text-amber-950 dark:text-amber-100 leading-relaxed max-w-xl mx-auto">
          {MSG}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel && (
            <Link
              href={secondaryHref}
              className="text-sm font-medium text-primary hover:underline"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
