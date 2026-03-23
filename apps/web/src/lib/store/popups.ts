import { clampStoredPopupDimensions } from '@/lib/popup-dimensions';
import { normalizePopupDock } from '@/lib/popup-dock';
import { getCmsHomeDocRaw } from '@/lib/store/home';

export interface StorePopupItem {
  id: string;
  imageUrl: string;
  linkUrl: string;
  priority?: number;
  slotIndex: number;
  widthPx: number;
  heightPx: number;
  dock: 'left' | 'center' | 'right';
}

interface PopupDoc {
  id?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  priority?: number;
  endDate?: { toDate?: () => Date } | string;
  slotIndex?: number;
  dock?: string;
  widthPx?: number;
  heightPx?: number;
}

function normalizePopup(raw: PopupDoc | null | undefined): StorePopupItem | null {
  const imageUrl = raw?.imageUrl?.trim();
  if (!imageUrl || raw?.isActive === false) return null;

  const endDate = typeof raw?.endDate === 'string'
    ? new Date(raw.endDate)
    : raw?.endDate?.toDate?.() ?? null;

  if (endDate && endDate.getTime() < Date.now()) return null;

  const slotIndex = Number(raw?.slotIndex ?? 0);
  const { widthPx, heightPx } = clampStoredPopupDimensions(raw?.widthPx, raw?.heightPx);

  return {
    id: raw?.id ?? `popup_${imageUrl}`,
    imageUrl,
    linkUrl: raw?.linkUrl?.trim() || '/',
    priority: 9999,
    slotIndex,
    widthPx,
    heightPx,
    dock: normalizePopupDock(raw?.dock, slotIndex),
  };
}

export async function getStorePopups(): Promise<StorePopupItem[]> {
  const doc = await getCmsHomeDocRaw();
  if (!doc) return [];

  const rawList = Array.isArray(doc.popups) && doc.popups.length > 0
    ? (doc.popups as PopupDoc[])
    : doc.popup
      ? [doc.popup as PopupDoc]
      : [];

  return rawList
    .map(normalizePopup)
    .filter((item): item is StorePopupItem => Boolean(item))
    .sort((a, b) => a.slotIndex - b.slotIndex)
    .map((item, index) => ({
      ...item,
      slotIndex: index,
      dock: normalizePopupDock(item.dock, index),
    }));
}
