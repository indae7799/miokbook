'use client';

import { useEffect, useState } from 'react';

const SHOW_AFTER_Y = 280;

export default function ScrollToTopFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_Y);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="맨 위로"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => visible && window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={[
        'fixed z-50 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md print:hidden',
        'bg-stone-900/95 hover:bg-stone-950 dark:bg-zinc-900/95 dark:hover:bg-zinc-950',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500',
        'motion-safe:transition-[opacity,transform,background-color,box-shadow] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
        visible
          ? 'pointer-events-auto translate-y-0 scale-100 opacity-100 shadow-md'
          : 'pointer-events-none translate-y-1.5 scale-95 opacity-0 shadow-none',
      ].join(' ')}
      style={{
        bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
        right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3.5 shrink-0 opacity-95"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 4 20 18H4L12 4z" />
      </svg>
    </button>
  );
}
