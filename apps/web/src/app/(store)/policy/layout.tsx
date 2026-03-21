import type { ReactNode } from 'react';

export default function PolicyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-gray-800">{children}</div>
  );
}
