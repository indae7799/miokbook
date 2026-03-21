import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  className?: string;
}

export default function SectionHeading({
  title,
  subtitle,
  rightSlot,
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="flex items-start gap-3 text-xl font-bold leading-tight tracking-tight text-foreground md:text-[30px]">
          <span
            className="home-section-title-bar mt-[0.08em] h-[1.25em] w-1.5 shrink-0 self-start md:w-2"
            aria-hidden
          />
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 pl-[18px] md:pl-5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {rightSlot ? <div className="shrink-0 pt-1">{rightSlot}</div> : null}
    </div>
  );
}
