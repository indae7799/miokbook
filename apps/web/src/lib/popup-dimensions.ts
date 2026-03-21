const STORED_PX_MAX = 8000;

/** CMS/Firestore에 넣을 가로·세로 (원본 픽셀 비율 보존용) */
export function clampStoredPopupDimensions(widthPx: unknown, heightPx: unknown): { widthPx: number; heightPx: number } {
  let w = Number(widthPx);
  let h = Number(heightPx);
  if (!Number.isFinite(w) || w < 1) w = 600;
  if (!Number.isFinite(h) || h < 1) h = 400;
  w = Math.min(STORED_PX_MAX, Math.max(1, Math.round(w)));
  h = Math.min(STORED_PX_MAX, Math.max(1, Math.round(h)));
  return { widthPx: w, heightPx: h };
}
