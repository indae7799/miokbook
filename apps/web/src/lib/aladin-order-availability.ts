import { supabaseAdmin } from '@/lib/supabase/admin';

const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const ISBN13_REGEX = /^97[89]\d{10}$/;

interface AladinItem {
  itemStatus?: string;
  stockStatus?: string;
}

type ExternalAvailability = {
  sellable: boolean;
  mappedStatus: 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition';
  reason: string;
};

function normalize(value: string | undefined): string {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

function mapExternalStatus(item: AladinItem): ExternalAvailability {
  const itemStatus = normalize(item.itemStatus);
  const stockStatus = normalize(item.stockStatus);
  const merged = `${itemStatus} ${stockStatus}`;

  if (merged.includes('절판')) {
    return { sellable: false, mappedStatus: 'out_of_print', reason: '절판' };
  }
  if (merged.includes('품절') || merged.includes('중고')) {
    return { sellable: false, mappedStatus: 'out_of_print', reason: '품절' };
  }
  if (merged.includes('구판')) {
    return { sellable: false, mappedStatus: 'old_edition', reason: '구판' };
  }
  if (merged.includes('예약판매')) {
    return { sellable: false, mappedStatus: 'coming_soon', reason: '예약판매' };
  }

  return { sellable: true, mappedStatus: 'on_sale', reason: '' };
}

async function fetchAladinAvailability(isbn: string, ttbKey: string): Promise<ExternalAvailability | null> {
  const url =
    `${ALADIN_BASE}?ttbkey=${encodeURIComponent(ttbKey)}` +
    `&itemIdType=ISBN13&ItemId=${encodeURIComponent(isbn)}` +
    '&output=js&Version=20131101&OptResult=subInfo';

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    const cleaned = text.replace(/;\s*$/, '').trim();
    const data = JSON.parse(cleaned) as { item?: AladinItem[]; errorCode?: number };
    if (data.errorCode || !data.item?.length) return null;
    return mapExternalStatus(data.item[0] ?? {});
  } catch (error) {
    console.error('[aladin-order-availability] lookup failed', { isbn, error });
    return null;
  }
}

export async function validateBookAvailabilityForOrder(isbn: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const normalizedIsbn = String(isbn ?? '').trim();
  if (!ISBN13_REGEX.test(normalizedIsbn)) {
    return { ok: false, reason: '구매불가' };
  }

  const ttbKey = process.env.ALADIN_TTB_KEY?.trim();
  if (!ttbKey) {
    return { ok: true };
  }

  const external = await fetchAladinAvailability(normalizedIsbn, ttbKey);
  if (!external) {
    return { ok: true };
  }

  if (external.sellable) {
    return { ok: true };
  }

  try {
    await supabaseAdmin
      .from('books')
      .update({ status: external.mappedStatus, updated_at: new Date().toISOString() })
      .eq('isbn', normalizedIsbn);
  } catch (error) {
    console.error('[aladin-order-availability] status sync failed', { isbn: normalizedIsbn, error });
  }

  return { ok: false, reason: external.reason || '구매불가' };
}
