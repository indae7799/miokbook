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
  const [mobileSlideIn, setMobileSlideIn] = useState(false);

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

    if (filtered.length > 0) {
      // 다음 프레임에 슬라이드업 시작 (transition 트리거)
      requestAnimationFrame(() => setMobileSlideIn(true));
    }
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
  const mobilePopup = visible[0];
  const { width: mW, height: mH } = popupIntrinsicSize(mobilePopup);

  return (
    <>
      {/* ── 모바일: 하단 슬라이드업 (sm 미만) ── */}
      <div
        className={`sm:hidden pointer-events-auto fixed inset-x-0 bottom-0 z-[60] transition-transform duration-500 ease-out ${
          mobileSlideIn ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* 반투명 오버레이 (팝업 위 영역 클릭 방지용) */}
        <div
          className="fixed inset-0 bg-black/40 -z-10"
          onClick={() => handleCloseOne(mobilePopup.id)}
          aria-hidden
        />
        <div className="overflow-hidden rounded-t-2xl border-t border-x border-border bg-card shadow-2xl">
          <Link
            href={mobilePopup.linkUrl || '/'}
            className="relative block w-full"
            style={{ aspectRatio: `${mW} / ${mH}` }}
            onClick={() => handleCloseOne(mobilePopup.id)}
          >
            <img
              src={mobilePopup.imageUrl}
              alt="스토어 팝업"
              width={mW}
              height={mH}
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              className="block h-full w-full object-cover"
            />
          </Link>
          <div className="flex items-center justify-between gap-2 border-t border-border bg-background px-4 py-3">
            <label className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={dontShowAgainChecked.has(mobilePopup.id)}
                onChange={() => toggleDontShowAgain(mobilePopup.id)}
                className="rounded border-input"
              />
              <span className="truncate">1일간 다시 보지 않기</span>
            </label>
            <Button type="button" variant="secondary" size="sm" onClick={() => handleCloseOne(mobilePopup.id)}>
              닫기
            </Button>
          </div>
        </div>
      </div>

      {/* ── 데스크탑: 기존 top-20 고정 (sm 이상) ── */}
      <div className="hidden sm:block pointer-events-auto fixed inset-x-0 top-20 z-[60] px-4">
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
                      decoding="sync"
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
    </>
  );
}
