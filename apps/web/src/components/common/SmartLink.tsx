import Link from 'next/link';
import type { ReactNode } from 'react';

interface SmartLinkProps {
  href?: string | null;
  children: ReactNode;
  className?: string;
}

/**
 * PRD: href.startsWith('http') → <a target="_blank" rel="noopener noreferrer">
 *      그 외 → Next.js <Link>
 */
export default function SmartLink({ href, children, className }: SmartLinkProps) {
  const safeHref = typeof href === 'string' && href.trim() ? href.trim() : '/';

  if (safeHref.startsWith('http')) {
    return (
      <a
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={safeHref} className={className}>
      {children}
    </Link>
  );
}
