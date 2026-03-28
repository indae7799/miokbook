'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { StorePopupItem } from '@/lib/store/popups';

const HIDE_ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MOBILE_SLIDE_IN_FALLBACK_MS = 320;
const EMPTY_POPUPS: StorePopupItem[] = [];

function popupIntrinsicSize(popup: { widthPx: number; heightPx: number }) {
  const width = Math.max(1, Number(popup.widthPx) || 600);
  const height = Math.max(1, Number(popup.heightPx) || 400);
  return { width, height };
}

function getPopupHideUntilKey(id: string) {
  return `popup_hide_until:${id}`;
}

function isPopupHiddenForOneDay(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const until = localStorage.getItem(getPopupHideUntilKey(id));
  return !!until && Number(until) > Date.now();
}

function getPopupRenderWidth(popup: StorePopupItem) {
  const { width, height } = popupIntrinsicSize(popup);
  return height > width ? 400 : 680;
}

function shouldShowOnPath(pathname: string): boolean {
  return pathname === '/';
}

interface Props {
  initialPopups?: StorePopupItem[];
}

interface PopupCardProps {
  popup: StorePopupItem;
  onHideOneDay: (id: string) => void;
  onClose: (id: string) => void;
  isExternal: (url: string) => boolean;
}

function DesktopPopupCard({ popup, onHideOneDay, onClose, isExternal }: PopupCardProps) {
  const { width, height } = popupIntrinsicSize(popup);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card shadow-lg"
      style={{ width: `min(calc(100vw - 16px), ${getPopupRenderWidth(popup)}px)` }}
    >
      <Link
        href={popup.linkUrl || '/'}
        className="relative block"
        style={{ aspectRatio: `${width} / ${height}` }}
        target={isExternal(popup.linkUrl || '') ? '_blank' : undefined}
        rel={isExternal(popup.linkUrl || '') ? 'noopener noreferrer' : undefined}
        onClick={() => onClose(popup.id)}
      >
        <img
          src={popup.imageUrl}
          alt="스토어 팝업"
          width={width}
          height={height}
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          className="block h-full w-full object-cover bg-muted"
        />
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-border bg-background p-2">
        <button
          type="button"
          onClick={() => onHideOneDay(popup.id)}
          className="min-w-0 truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          1일간 다시 보지 않기
        </button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onClose(popup.id)}>
          닫기
        </Button>
      </div>
    </div>
  );
}

export default function StorePopup({ initialPopups = EMPTY_POPUPS }: Props) {
  const pathname = usePathname() || '/';
  const [sourcePopups, setSourcePopups] = useState<StorePopupItem[]>(initialPopups);
  const [popups, setPopups] = useState<StorePopupItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mobileSlideIn, setMobileSlideIn] = useState(false);
  const mobileSheetMotionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (initialPopups.length > 0) {
      setSourcePopups(initialPopups);
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
        const res = await fetch('/api/store/popup', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as StorePopupItem[];
        if (!cancelled) setSourcePopups(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSourcePopups([]);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [initialPopups]);

  useEffect(() => {
    setMobileSlideIn(false);

    const hideAllUntil = localStorage.getItem('popup_hide_until');
    if (hideAllUntil && Number(hideAllUntil) > Date.now()) {
      setPopups([]);
      return;
    }

    const filtered = sourcePopups
      .filter((popup) => popup?.imageUrl?.trim())
      .filter(() => shouldShowOnPath(pathname))
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
      .filter((popup) => !isPopupHiddenForOneDay(popup.id));

    setPopups(filtered);

    if (filtered.length > 0) {
      let raf1 = 0;
      let raf2 = 0;
      let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

      const reveal = () => setMobileSlideIn(true);

      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          const element = mobileSheetMotionRef.current;
          if (element) void element.getBoundingClientRect();
          reveal();
        });
      });

      fallbackTimer = setTimeout(reveal, MOBILE_SLIDE_IN_FALLBACK_MS);

      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        if (fallbackTimer !== undefined) clearTimeout(fallbackTimer);
      };
    }

    return undefined;
  }, [sourcePopups, pathname]);

  const handleCloseOne = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const handleHideOneDay = (id: string) => {
    localStorage.setItem(getPopupHideUntilKey(id), String(Date.now() + HIDE_ONE_DAY_MS));
    handleCloseOne(id);
  };

  const visible = useMemo(
    () => popups.filter((popup) => !dismissed.has(popup.id)),
    [popups, dismissed],
  );

  const desktopColumns = useMemo(
    () => [
      visible.filter((popup) => popup.dock === 'left'),
      visible.filter((popup) => popup.dock === 'center'),
      visible.filter((popup) => popup.dock === 'right'),
    ],
    [visible],
  );

  if (visible.length === 0) return null;

  const isExternal = (url: string) => /^https?:\/\//.test(url);
  const isSingle = visible.length === 1;
  const mobilePopup = visible[0];
  const { width: mobileWidth, height: mobileHeight } = popupIntrinsicSize(mobilePopup);

  return (
    <>
      <div
        className={`fixed inset-0 z-[59] bg-black/45 transition-opacity duration-[620ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:hidden ${
          mobileSlideIn ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => handleCloseOne(mobilePopup.id)}
        aria-hidden
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-[60] px-0 sm:hidden ${
          mobileSlideIn ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          ref={mobileSheetMotionRef}
          className={`mx-auto w-full max-w-lg origin-bottom transition-[transform,opacity] duration-[720ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
            mobileSlideIn
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-[120%] scale-[0.985] opacity-0'
          }`}
        >
          <div className="overflow-hidden rounded-t-2xl border-x border-t border-border bg-card shadow-[0_-12px_40px_rgba(0,0,0,0.18)]">
            <Link
              href={mobilePopup.linkUrl || '/'}
              className="relative block w-full"
              style={{ aspectRatio: `${mobileWidth} / ${mobileHeight}` }}
              target={isExternal(mobilePopup.linkUrl || '') ? '_blank' : undefined}
              rel={isExternal(mobilePopup.linkUrl || '') ? 'noopener noreferrer' : undefined}
              onClick={() => handleCloseOne(mobilePopup.id)}
            >
              <img
                src={mobilePopup.imageUrl}
                alt="스토어 팝업"
                width={mobileWidth}
                height={mobileHeight}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="block h-full w-full object-cover bg-muted"
              />
            </Link>
            <div
              className="flex items-center justify-between gap-2 border-t border-border bg-background px-4 py-3"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <button
                type="button"
                onClick={() => handleHideOneDay(mobilePopup.id)}
                className="min-w-0 truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                1일간 다시 보지 않기
              </button>
              <Button type="button" variant="secondary" size="sm" onClick={() => handleCloseOne(mobilePopup.id)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto fixed inset-x-0 top-20 z-[60] hidden px-4 sm:block">
        <div className={isSingle ? 'mx-auto flex justify-center' : 'mx-auto max-w-[1480px]'}>
          {isSingle ? (
            <DesktopPopupCard
              popup={visible[0]}
              onHideOneDay={handleHideOneDay}
              onClose={handleCloseOne}
              isExternal={isExternal}
            />
          ) : (
            <div className="grid grid-cols-3 items-start gap-3">
              {desktopColumns.map((column, index) => (
                <div key={`dock-${index}`} className="flex min-w-0 flex-col gap-3">
                  {column.map((popup) => (
                    <DesktopPopupCard
                      key={popup.id}
                      popup={popup}
                      onHideOneDay={handleHideOneDay}
                      onClose={handleCloseOne}
                      isExternal={isExternal}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
