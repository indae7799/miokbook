import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  className?: string;
  density?: 'compact' | 'expanded';
}

export default function SectionHeading({
  title,
  subtitle,
  rightSlot,
  className = '',
  density = 'compact',
}: SectionHeadingProps) {
  const isExpanded = density === 'expanded';
  return (
    <div
      className={`flex flex-col items-start ${isExpanded ? 'gap-3 sm:gap-4' : 'gap-2.5 sm:gap-3'} sm:flex-row sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <h2
          className={`flex items-start ${isExpanded ? 'gap-3.5 text-[22px] md:text-[32px]' : 'gap-3 text-xl md:text-[30px]'} font-bold leading-tight tracking-tight text-foreground`}
        >
          <span
            className="home-section-title-bar mt-[0.08em] h-[1.25em] w-1.5 shrink-0 self-start md:w-2"
            aria-hidden
          />
          {title}
        </h2>
        {subtitle && (
          <p
            className={`${isExpanded ? 'mt-2' : 'mt-1.5'} break-keep pl-[18px] md:pl-5 text-[13px] font-medium leading-6 tracking-[-0.01em] text-foreground/80 md:text-[15px]`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {rightSlot ? <div className="w-full pt-0.5 sm:w-auto sm:shrink-0 sm:pt-1">{rightSlot}</div> : null}
    </div>
  );
}
