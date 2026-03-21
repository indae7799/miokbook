'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { PopupDock } from '@/lib/popup-dock';

const GAP_ZONE = 12; // 좌·중·우 구역 사이
const GAP_STACK = 6; // 같은 구역 안 세로 겹침

/** CMS에 저장된 원본 비율(가로·세로 픽셀) */
function popupIntrinsicRatio(popup: { widthPx: number; heightPx: number }): { iw: number; ih: number } {
  const iw = Math.max(1, Number(popup.widthPx) || 600);
  const ih = Math.max(1, Number(popup.heightPx) || Math.round(iw * (400 / 600)));
  return { iw, ih };
}

const HIDE_ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getPopupHideUntilKey(id: string) {
  return `popup_hide_until:${id}`;
}

function isPopupHiddenForOneDay(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const until = localStorage.getItem(getPopupHideUntilKey(id));
  return !!until && Number(until) > Date.now();
}

interface PopupData {
  id: string;
  imageUrl: string;
  linkUrl: string;
  priority?: number;
  slotIndex: number;
  widthPx: number;
  heightPx: number;
  dock?: PopupDock;
}

export default function StorePopup() {
  const [popups, setPopups] = useState<PopupData[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/store/popup')
      .then((res) => res.json())
      .then((data: PopupData[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const hideAllUntil = localStorage.getItem('popup_hide_until');
        if (hideAllUntil && Number(hideAllUntil) > Date.now()) return;
        const list = data
          .filter((p) => p?.imageUrl?.trim())
          .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
          .filter((p) => !isPopupHiddenForOneDay(p.id));
        setPopups(list);
      })
      .catch(() => {});
  }, []);

  const handleCloseOne = (id: string) => {
    if (dontShowAgainChecked.has(id)) {
      const until = Date.now() + HIDE_ONE_DAY_MS;
      localStorage.setItem(getPopupHideUntilKey(id), String(until));
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
    () => popups.filter((p) => !dismissed.has(p.id)),
    [popups, dismissed],
  );

  const { left, center, right } = useMemo(() => {
    const l: PopupData[] = [];
    const c: PopupData[] = [];
    const r: PopupData[] = [];
    for (const p of visible) {
      const d = p.dock;
      if (d === 'center') c.push(p);
      else if (d === 'right') r.push(p);
      else l.push(p);
    }
    return { left: l, center: c, right: r };
  }, [visible]);

  if (visible.length === 0) return null;

  const zones = [
    { key: 'left' as const, items: left, align: 'items-start' as const },
    { key: 'center' as const, items: center, align: 'items-center' as const },
    { key: 'right' as const, items: right, align: 'items-end' as const },
  ].filter((z) => z.items.length > 0);

  const zoneCount = zones.length;
  const imageSizes =
    zoneCount <= 1
      ? '(max-width: 768px) min(96vw, 480px), min(50vw, 960px)'
      : `(max-width: 768px) ${Math.ceil(90 / zoneCount)}vw, ${Math.ceil(48 / zoneCount)}vw`;

  const renderCard = (popup: PopupData) => {
    const imageUrl = popup.imageUrl?.trim();
    if (!imageUrl) return null;
    const { iw, ih } = popupIntrinsicRatio(popup);

    return (
      <div
        key={popup.id}
        className="relative flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
      >
        <Link
          href={popup.linkUrl || '/'}
          className="relative block w-full overflow-hidden rounded-t-xl"
          style={{ aspectRatio: `${iw} / ${ih}` }}
          onClick={() => handleCloseOne(popup.id)}
        >
          <Image
            src={imageUrl}
            alt="이벤트 팝업"
            fill
            className="object-cover object-center"
            sizes={imageSizes}
            priority
          />
        </Link>
        <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground shrink-0">
            <input
              type="checkbox"
              checked={dontShowAgainChecked.has(popup.id)}
              onChange={() => toggleDontShowAgain(popup.id)}
              className="rounded border-input"
            />
            <span>1일간 다시 보지 않기</span>
          </label>
          <Button type="button" variant="secondary" size="sm" onClick={() => handleCloseOne(popup.id)}>
            닫기
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="pointer-events-auto fixed left-1/2 top-20 z-[60] flex w-full max-w-[min(50vw,calc(100vw-1rem))] -translate-x-1/2 flex-col items-center px-2"
    >
      <div className="flex w-full flex-row items-start justify-between" style={{ gap: GAP_ZONE }}>
        {zones.map((zone) => (
          <div
            key={zone.key}
            className={`flex min-w-0 flex-1 flex-col ${zone.align}`}
            style={{ gap: GAP_STACK }}
          >
            {zone.items.map((popup) => renderCard(popup))}
          </div>
        ))}
      </div>
    </div>
  );
}
