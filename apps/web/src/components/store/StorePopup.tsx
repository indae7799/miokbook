'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { StorePopupItem } from '@/lib/store/popups';

const HIDE_ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

interface Props {
  initialPopups?: StorePopupItem[];
}

export default function StorePopup({ initialPopups = [] }: Props) {
  const [popups, setPopups] = useState<StorePopupItem[]>(initialPopups);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    const hideAllUntil = localStorage.getItem('popup_hide_until');
    if (hideAllUntil && Number(hideAllUntil) > Date.now()) {
      setPopups([]);
      return;
    }

    const filtered = initialPopups
      .filter((popup) => popup?.imageUrl?.trim())
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
      .filter((popup) => !isPopupHiddenForOneDay(popup.id));

    setPopups(filtered);
  }, [initialPopups]);

  const handleCloseOne = (id: string) => {
    if (dontShowAgainChecked.has(id)) {
      localStorage.setItem(getPopupHideUntilKey(id), String(Date.now() + HIDE_ONE_DAY_MS));
    }

    setDismissed((prev) => new Set([...prev, id]));
    setDontShowAgainChecked((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleDontShowAgain = (id: string) => {
    setDontShowAgainChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visible = useMemo(
    () => popups.filter((popup) => !dismissed.has(popup.id)),
    [popups, dismissed],
  );

  if (visible.length === 0) return null;

  const isSingle = visible.length === 1;

  return (
    <div className="pointer-events-auto fixed inset-x-0 top-20 z-[60] px-2 sm:px-4">
      <div className={isSingle ? 'mx-auto flex justify-center' : 'mx-auto max-w-[1480px]'}>
        <div
          className={isSingle ? '' : 'grid justify-start gap-3'}
          style={
            isSingle
              ? undefined
              : {
                  gridTemplateColumns: 'repeat(3, max-content)',
                  gridAutoRows: 'max-content',
                }
          }
        >
          {visible.map((popup) => {
            const { width, height } = popupIntrinsicSize(popup);
            const renderWidth = getPopupRenderWidth(popup);

            return (
              <div
                key={popup.id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                style={{
                  width: `min(calc(100vw - 16px), ${renderWidth}px)`,
                }}
              >
                <Link
                  href={popup.linkUrl || '/'}
                  className="relative block"
                  style={{ aspectRatio: `${width} / ${height}` }}
                  onClick={() => handleCloseOne(popup.id)}
                >
                  <img
                    src={popup.imageUrl}
                    alt="스토어 팝업"
                    width={width}
                    height={height}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className="block h-full w-full object-cover"
                  />
                </Link>
                <div className="flex items-center justify-between gap-2 border-t border-border bg-background p-2">
                  <label className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={dontShowAgainChecked.has(popup.id)}
                      onChange={() => toggleDontShowAgain(popup.id)}
                      className="rounded border-input"
                    />
                    <span className="truncate">1일간 다시 보지 않기</span>
                  </label>
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleCloseOne(popup.id)}>
                    닫기
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
