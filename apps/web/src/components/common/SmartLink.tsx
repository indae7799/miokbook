import Link from 'next/link';
import type { ReactNode } from 'react';

interface SmartLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/**
 * PRD: href.startsWith('http') → <a target="_blank" rel="noopener noreferrer">
 *      그 외 → Next.js <Link>
 */
export default function SmartLink({ href, children, className }: SmartLinkProps) {
  if (href.startsWith('http')) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
