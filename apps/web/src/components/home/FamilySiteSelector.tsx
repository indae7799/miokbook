'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

const FAMILY_SITES = [
  { label: '씨앤에이논술', href: 'https://rainbownonsul.net' },
];

export default function FamilySiteSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {open && (
        <ul className="absolute bottom-full right-0 z-20 mb-1.5 min-w-[160px] overflow-hidden rounded-md border border-border bg-background shadow-lg">
          {FAMILY_SITES.map((site) => (
            <li key={site.href}>
              <a
                href={site.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                {site.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        Family site
        <ChevronUp className={`size-3 transition-transform duration-200 ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}
