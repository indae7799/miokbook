import type { ReactNode } from 'react';

/** 새로운 3.txt: 섹션 공통 wrapper — 여백·제목 스타일 통일 */
export interface HomeSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function HomeSection({ title, children, className = '' }: HomeSectionProps) {
  return (
    <section className={`space-y-3 w-full ${className}`}>
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
