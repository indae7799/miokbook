/**
 * 스토어 실시간 CMS API·클라이언트와 홈 SSR이 동일 규칙으로 파싱
 */

export type LiveStoreHero = { imageUrl: string; linkUrl: string } | null;
export type LiveBottomBanner = { id: string; imageUrl: string; linkUrl: string } | null;
export type LiveHeroBanner = { id: string; imageUrl: string; linkUrl: string; position: string };

function cmsBannerStartMs(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
    const fn = (raw as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') return fn.call(raw).getTime();
  }
  if (typeof raw === 'string') {
    const s = raw.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T00:00:00+09:00`);
    const t = Date.parse(raw);
    return Number.isNaN(t) ? 0 : t;
  }
  if (raw instanceof Date) return raw.getTime();
  return 0;
}

function cmsBannerEndMs(raw: unknown): number {
  if (raw == null || raw === '') return Infinity;
  if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
    const fn = (raw as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') return fn.call(raw).getTime();
  }
  if (typeof raw === 'string') {
    const s = raw.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T23:59:59.999+09:00`);
    const t = Date.parse(raw);
    return Number.isNaN(t) ? Infinity : t;
  }
  if (raw instanceof Date) return raw.getTime();
  return Infinity;
}

export function parseCmsLivePayload(d: Record<string, unknown> | undefined | null): {
  storeHero: LiveStoreHero;
  mainBottomLeft: LiveBottomBanner;
  mainBottomRight: LiveBottomBanner;
  heroBannersMainHero: LiveHeroBanner[];
} {
  if (!d) {
    return {
      storeHero: null,
      mainBottomLeft: null,
      mainBottomRight: null,
      heroBannersMainHero: [],
    };
  }

  const sh = d.storeHeroImage as { imageUrl?: unknown; linkUrl?: unknown } | null | undefined;
  const storeHeroImageUrl = sh && typeof sh === 'object' ? String(sh.imageUrl ?? '').trim() : '';
  const storeHero: LiveStoreHero =
    storeHeroImageUrl
      ? { imageUrl: storeHeroImageUrl, linkUrl: (sh && String(sh.linkUrl ?? '/').trim()) || '/' }
      : null;

  const mbl = d.mainBottomLeft as { imageUrl?: unknown; linkUrl?: unknown } | null | undefined;
  const mblUrl = mbl && typeof mbl === 'object' ? String(mbl.imageUrl ?? '').trim() : '';
  const mainBottomLeft: LiveBottomBanner = mblUrl
    ? { id: 'main_bottom_left', imageUrl: mblUrl, linkUrl: (mbl && String(mbl.linkUrl ?? '/').trim()) || '/' }
    : null;

  const mbr = d.mainBottomRight as { imageUrl?: unknown; linkUrl?: unknown } | null | undefined;
  const mbrUrl = mbr && typeof mbr === 'object' ? String(mbr.imageUrl ?? '').trim() : '';
  const mainBottomRight: LiveBottomBanner = mbrUrl
    ? { id: 'main_bottom_right', imageUrl: mbrUrl, linkUrl: (mbr && String(mbr.linkUrl ?? '/').trim()) || '/' }
    : null;

  const rawBanners = Array.isArray(d.heroBanners) ? (d.heroBanners as Record<string, unknown>[]) : [];
  const now = Date.now();
  const heroBannersMainHero: LiveHeroBanner[] = rawBanners
    .filter((b) => b && typeof b === 'object' && b.isActive !== false)
    .map((b) => ({
      id: String(b.id ?? ''),
      imageUrl: String(b.imageUrl ?? '').trim(),
      linkUrl: String(b.linkUrl ?? '/'),
      position: String(b.position ?? 'main_hero'),
      startDate: cmsBannerStartMs(b.startDate),
      endDate: cmsBannerEndMs(b.endDate),
      ord: Number(b.order ?? 0),
    }))
    .filter((b) => now >= b.startDate && now <= b.endDate && b.imageUrl.length > 0)
    .sort((a, b) => a.ord - b.ord)
    .map(({ id, imageUrl, linkUrl, position }) => ({ id, imageUrl, linkUrl, position }));

  return { storeHero, mainBottomLeft, mainBottomRight, heroBannersMainHero };
}
