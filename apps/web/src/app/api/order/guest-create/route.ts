import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculatePromotionDiscount, getPromotionOption } from '@/lib/checkout-promotions';
import { calculateShippingFee } from '@/lib/store-settings';
import { getStoreSettings } from '@/lib/store-settings.server';

export const dynamic = 'force-dynamic';

const EXPIRES_MINUTES = 30;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const attempts = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > RATE_LIMIT;
}

type CreateItem = { isbn: string; quantity: number };

function hasMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const text = [record.code, record.message, record.details, record.hint].filter(Boolean).join(' ');
  return text.includes('42703') || text.includes('PGRST204');
}

function getMissingColumnName(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = String((error as Record<string, unknown>).message ?? '');
  const matched = message.match(/'([^']+)' column of 'orders'/i);
  return matched?.[1] ?? null;
}

function serializeError(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== 'object') return null;
  const record = error as Record<string, unknown>;
  return {
    code: record.code ?? null,
    message: record.message ?? null,
    details: record.details ?? null,
    hint: record.hint ?? null,
  };
}

async function insertOrderWithCompatibility(payload: Record<string, unknown>): Promise<void> {
  const insertPayload: Record<string, unknown> = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { error } = await supabaseAdmin.from('orders').insert(insertPayload);
    if (!error) return;
    if (!hasMissingColumnError(error)) throw error;
    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !(missingColumn in insertPayload)) throw error;
    delete insertPayload[missingColumn];
  }
  throw new Error('ORDER_COMPAT_INSERT_FAILED');
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const items = body.items as CreateItem[] | undefined;
    const shippingAddress = body.shippingAddress as Record<string, string> | undefined;
    const promotionCode = typeof body.promotionCode === 'string' ? body.promotionCode : null;

    if (!Array.isArray(items) || items.length === 0 || !shippingAddress) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const normalizedItems = items.map((row) => ({
      isbn: String(row.isbn ?? '').trim(),
      quantity: Math.min(10, Math.max(1, Number(row.quantity) || 1)),
    }));

    for (const item of normalizedItems) {
      if (!/^(978|979)\d{10}$/.test(item.isbn)) {
        return NextResponse.json({ error: 'INVALID_ISBN' }, { status: 400 });
      }
    }

    const uniqueIsbns = Array.from(new Set(normalizedItems.map((item) => item.isbn)));
    const [{ data: books, error: booksError }, { data: inventoryRows, error: inventoryError }] = await Promise.all([
      supabaseAdmin.from('books').select('isbn, slug, title, cover_image, sale_price').in('isbn', uniqueIsbns),
      supabaseAdmin.from('inventory').select('isbn, stock, reserved').in('isbn', uniqueIsbns),
    ]);

    if (booksError) throw booksError;
    if (inventoryError) throw inventoryError;

    const booksByIsbn = new Map((books ?? []).map((book) => [book.isbn, book]));
    const inventoryByIsbn = new Map((inventoryRows ?? []).map((row) => [row.isbn, row]));

    const orderItems: Array<{
      isbn: string; slug: string; title: string;
      coverImage: string; quantity: number; unitPrice: number;
    }> = [];
    let totalPrice = 0;

    for (const item of normalizedItems) {
      const book = booksByIsbn.get(item.isbn);
      if (!book) return NextResponse.json({ error: 'BOOK_NOT_FOUND' }, { status: 400 });
      const unitPrice = Number(book.sale_price ?? 0);
      if (unitPrice <= 0) return NextResponse.json({ error: 'INVALID_PRICE' }, { status: 400 });
      const inventory = inventoryByIsbn.get(item.isbn);
      const stock = Number(inventory?.stock ?? 0);
      const reserved = Number(inventory?.reserved ?? 0);
      if (stock - reserved < item.quantity) {
        return NextResponse.json({ error: 'STOCK_SHORTAGE' }, { status: 409 });
      }
      orderItems.push({
        isbn: item.isbn,
        slug: String(book.slug ?? ''),
        title: String(book.title ?? ''),
        coverImage: String(book.cover_image ?? ''),
        quantity: item.quantity,
        unitPrice,
      });
      totalPrice += item.quantity * unitPrice;
    }

    const normalizedAddress = {
      name: String(shippingAddress.name ?? '').trim(),
      phone: String(shippingAddress.phone ?? '').trim(),
      zipCode: String(shippingAddress.zipCode ?? '').trim(),
      address: String(shippingAddress.address ?? '').trim(),
      detailAddress: String(shippingAddress.detailAddress ?? '').trim(),
    };
    const deliveryMemo = String(shippingAddress.deliveryMemo ?? '').trim();
    if (!normalizedAddress.name || !normalizedAddress.phone || !normalizedAddress.address) {
      return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
    }

    const storeSettings = await getStoreSettings();
    const shippingFee = calculateShippingFee(totalPrice, storeSettings);
    const promotion = getPromotionOption(promotionCode);
    const promotionDiscount = calculatePromotionDiscount(totalPrice, shippingFee, promotionCode);
    const payableAmount = Math.max(0, totalPrice + shippingFee - promotionDiscount);
    if (payableAmount <= 0) {
      return NextResponse.json({ error: 'INVALID_PRICE' }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRES_MINUTES * 60 * 1000).toISOString();
    const orderId = crypto.randomUUID();
    const nowIso = now.toISOString();

    const orderInsert = {
      order_id: orderId,
      user_id: null,
      guest_phone: normalizedAddress.phone,
      status: 'pending',
      shipping_status: 'ready',
      items: orderItems,
      total_price: totalPrice,
      shipping_fee: shippingFee,
      points_used: 0,
      points_earned: 0,
      payable_amount: payableAmount,
      delivery_memo: deliveryMemo,
      promotion_code: promotion?.code ?? null,
      promotion_label: promotion?.label ?? null,
      promotion_discount: promotionDiscount,
      shipping_address: {
        ...normalizedAddress,
        deliveryMemo,
        promotionCode: promotion?.code ?? null,
        promotionLabel: promotion?.label ?? null,
        promotionDiscount,
      },
      payment_key: null,
      created_at: nowIso,
      updated_at: nowIso,
      expires_at: expiresAt,
      paid_at: null,
      cancelled_at: null,
      delivered_at: null,
      return_status: 'none',
      return_reason: null,
    };

    await insertOrderWithCompatibility(orderInsert);

    for (const item of normalizedItems) {
      const inventory = inventoryByIsbn.get(item.isbn);
      const { error } = await supabaseAdmin.from('inventory').upsert({
        isbn: item.isbn,
        stock: Number(inventory?.stock ?? 0),
        reserved: Number(inventory?.reserved ?? 0) + item.quantity,
        updated_at: nowIso,
      });
      if (error) throw error;
    }

    return NextResponse.json({
      orderId,
      totalPrice,
      shippingFee,
      pointsUsed: 0,
      pointsEarned: 0,
      deliveryMemo,
      promotionCode: promotion?.code ?? null,
      promotionLabel: promotion?.label ?? null,
      promotionDiscount,
      payableAmount,
      expiresAt,
    });
  } catch (e) {
    console.error('[api/order/guest-create]', e);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        detail: process.env.NODE_ENV === 'development' ? serializeError(e) ?? String(e) : undefined,
      },
      { status: 500 }
    );
  }
}
