export type PopupDock = 'left' | 'center' | 'right';

export const POPUP_DOCK_LABEL: Record<PopupDock, string> = {
  left: '왼쪽',
  center: '가운데',
  right: '오른쪽',
};

/** CMS dock 값 또는 등록 순 slotIndex(0,1,2→좌·중·우)로 기본 배치 */
export function normalizePopupDock(raw: unknown, slotIndexFromCms: number): PopupDock {
  if (raw === 'left' || raw === 'center' || raw === 'right') return raw;
  const s = Number.isFinite(slotIndexFromCms) ? Math.floor(slotIndexFromCms) : 0;
  const m = ((s % 3) + 3) % 3;
  return m === 0 ? 'left' : m === 1 ? 'center' : 'right';
}
