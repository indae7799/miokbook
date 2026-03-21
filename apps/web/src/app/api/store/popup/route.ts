import { NextResponse } from 'next/server';
import { clampStoredPopupDimensions } from '@/lib/popup-dimensions';
import { normalizePopupDock } from '@/lib/popup-dock';
import { getCmsHomeDocRaw } from '@/lib/store/home';

export const revalidate = 300;

interface PopupDoc {
  id?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  priority?: number;
  endDate?: { toDate?: () => Date } | string;
  slotIndex?: number;
  /** 스토어 가로 배치: left | center | right */
  dock?: string;
  widthPx?: number;
  heightPx?: number;
}

function normalizePopup(raw: PopupDoc | null | undefined): (PopupDoc & { id: string; priority: number; slotIndex: number; widthPx: number; heightPx: number }) | null {
  const imageUrl = raw?.imageUrl?.trim();
  if (!imageUrl || raw?.isActive === false) return null;
  const r = raw!;
  const endDate = typeof r.endDate === 'string'
    ? new Date(r.endDate)
    : r.endDate?.toDate?.() ?? null;
  if (endDate && endDate.getTime() < Date.now()) return null;
  const slotIndex = Number(r.slotIndex ?? 0);
  const { widthPx, heightPx } = clampStoredPopupDimensions(r.widthPx, r.heightPx);
  return {
    ...r,
    imageUrl,
    id: r.id ?? `popup_${imageUrl}`,
    priority: 9999,
    slotIndex,
    widthPx,
    heightPx,
  };
}

export async function GET() {
  try {
    const d = await getCmsHomeDocRaw();
    const rawList = !d
      ? []
      : Array.isArray(d.popups) && (d.popups as PopupDoc[]).length > 0
        ? (d.popups as PopupDoc[])
        : (d.popup ? [d.popup as PopupDoc] : []);
    const candidates = rawList
      .map((popup, index) => ({ popup: normalizePopup(popup), index }))
      .filter((item): item is { popup: NonNullable<ReturnType<typeof normalizePopup>>; index: number } => !!item.popup)
      .sort((a, b) => a.popup.slotIndex - b.popup.slotIndex);

    // 배치 순서 보장: 정렬된 순서대로 0(왼쪽), 1(가운데), 2(오른쪽), 3(다음 줄 왼쪽)...
    const list = candidates.map(({ popup }, index) => ({
      id: popup.id,
      imageUrl: popup.imageUrl,
      linkUrl: popup.linkUrl ?? '/',
      priority: popup.priority,
      slotIndex: index,
      widthPx: popup.widthPx,
      heightPx: popup.heightPx,
      dock: normalizePopupDock((popup as PopupDoc).dock, popup.slotIndex),
    }));

    return NextResponse.json(list, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json([]);
  }
}
