import { supabaseAdmin } from '@/lib/supabase/admin';

const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const ISBN13_REGEX = /^97[89]\d{10}$/;
const DEFAULT_EXTERNAL_SELLABLE_STOCK = Math.max(0, Number(process.env.AUTO_IMPORTED_BOOK_STOCK ?? 999) || 999);

interface AladinItem {
  itemStatus?: string;
  stockStatus?: string;
}

type ExternalAvailability = {
  sellable: boolean;
  mappedStatus: 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition';
  reason: string;
};

type CurrentBookState = {
  status?: string | null;
  stock?: number | null;
  reserved?: number | null;
};

export type OrderAvailabilityResult =
  | { ok: true; status: string; available: number; stock: number; reserved: number }
  | { ok: false; reason: string; status: string; available: number; stock: number; reserved: number };

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

export async function validateBookAvailabilityForOrder(
  isbn: string,
  current: CurrentBookState = {},
): Promise<OrderAvailabilityResult> {
  const normalizedIsbn = String(isbn ?? '').trim();
  const currentStatus = String(current.status ?? '').trim();
  const currentStock = Number(current.stock ?? 0);
  const currentReserved = Number(current.reserved ?? 0);
  const currentAvailable = Math.max(0, currentStock - currentReserved);

  if (!ISBN13_REGEX.test(normalizedIsbn)) {
    return { ok: false, reason: '구매불가', status: currentStatus, available: currentAvailable, stock: currentStock, reserved: currentReserved };
  }

  const ttbKey = process.env.ALADIN_TTB_KEY?.trim();
  if (!ttbKey) {
    return { ok: true, status: currentStatus, available: currentAvailable, stock: currentStock, reserved: currentReserved };
  }

  const external = await fetchAladinAvailability(normalizedIsbn, ttbKey);
  if (!external) {
    return { ok: true, status: currentStatus, available: currentAvailable, stock: currentStock, reserved: currentReserved };
  }

  if (external.sellable) {
    let effectiveAvailable = currentAvailable;
    let effectiveStock = currentStock;
    const reserved = Math.max(0, currentReserved);

    try {
      if (currentStatus !== 'on_sale') {
        await supabaseAdmin
          .from('books')
          .update({ status: 'on_sale', updated_at: new Date().toISOString() })
          .eq('isbn', normalizedIsbn);
      }

      if (effectiveAvailable <= 0) {
        effectiveStock = Math.max(currentStock, DEFAULT_EXTERNAL_SELLABLE_STOCK);
        effectiveAvailable = Math.max(0, effectiveStock - reserved);

        await supabaseAdmin.from('inventory').upsert(
          {
            isbn: normalizedIsbn,
            stock: effectiveStock,
            reserved,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'isbn' },
        );
      }
    } catch (error) {
      console.error('[aladin-order-availability] sellable sync failed', { isbn: normalizedIsbn, error });
    }

    return {
      ok: true,
      status: 'on_sale',
      available: effectiveAvailable,
      stock: effectiveAvailable + reserved,
      reserved,
    };
  }

  try {
    await supabaseAdmin
      .from('books')
      .update({ status: external.mappedStatus, updated_at: new Date().toISOString() })
      .eq('isbn', normalizedIsbn);
  } catch (error) {
    console.error('[aladin-order-availability] status sync failed', { isbn: normalizedIsbn, error });
  }

  return {
    ok: false,
    reason: external.reason || '구매불가',
    status: external.mappedStatus,
    available: currentAvailable,
    stock: currentStock,
    reserved: currentReserved,
  };
}
