'use client';

import Link from 'next/link';

/** 유튜브 임베드와 유사한 중앙 빨간 재생 마크 */
export function YoutubeStylePlayIcon({ className = '' }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none inline-flex h-12 w-[4.5rem] shrink-0 items-center justify-center rounded-[10px] bg-[#ff0000] shadow-[0_6px_28px_rgba(0,0,0,0.45)] sm:h-14 sm:w-[4.75rem] sm:rounded-[12px] ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 text-white sm:h-8 sm:w-8" fill="currentColor" aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

/**
 * 썸네일 위 전체 영역 탭 → 재생(또는 상세 이동).
 * 유튜브처럼 중앙 빨간 버튼만 보이고, 실제 히트 영역은 전체.
 */
export function YoutubePlayTapArea({
  label,
  onActivate,
  href,
}: {
  label: string;
  onActivate?: () => void;
  href?: string;
}) {
  const className =
    'absolute inset-0 z-20 flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-4 focus-visible:ring-offset-black/30';
  const content = <YoutubeStylePlayIcon />;

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label} scroll>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onActivate} className={className} aria-label={label}>
      {content}
    </button>
  );
}
