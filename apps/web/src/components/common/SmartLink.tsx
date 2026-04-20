import Link from 'next/link';
import type { ReactNode } from 'react';
import { isExternalLinkUrl, normalizeCmsLinkUrl } from '@/lib/link-url';

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
  const safeHref = normalizeCmsLinkUrl(href, '/');

  if (isExternalLinkUrl(safeHref)) {
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
  if (/^[a-z][a-z\d+\-.]*:/i.test(safeHref)) {
    return (
      <a href={safeHref} className={className}>
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
