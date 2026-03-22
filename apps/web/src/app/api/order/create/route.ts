import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateShippingFee } from '@/lib/store-settings';
import { getStoreSettings } from '@/lib/store-settings.server';

export const dynamic = 'force-dynamic';
const EXPIRES_MINUTES = 30;

type CreateItem = { isbn: string; quantity: number };

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);

    const body = await request.json().catch(() => ({}));
    const items = body.items as CreateItem[] | undefined;
    const shippingAddress = body.shippingAddress as Record<string, string> | undefined;
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
      supabaseAdmin
        .from('books')
        .select('isbn, slug, title, cover_image, sale_price')
        .in('isbn', uniqueIsbns),
      supabaseAdmin
        .from('inventory')
        .select('isbn, stock, reserved')
        .in('isbn', uniqueIsbns),
    ]);

    if (booksError) throw booksError;
    if (inventoryError) throw inventoryError;

    const booksByIsbn = new Map((books ?? []).map((book) => [book.isbn, book]));
    const inventoryByIsbn = new Map((inventoryRows ?? []).map((row) => [row.isbn, row]));

    const orderItems: Array<{
      isbn: string;
      slug: string;
      title: string;
      coverImage: string;
      quantity: number;
      unitPrice: number;
    }> = [];
    let totalPrice = 0;

    for (const item of normalizedItems) {
      const book = booksByIsbn.get(item.isbn);
      if (!book) {
        return NextResponse.json({ error: 'BOOK_NOT_FOUND' }, { status: 400 });
      }

      const unitPrice = Number(book.sale_price ?? 0);
      if (unitPrice <= 0) {
        return NextResponse.json({ error: 'INVALID_PRICE' }, { status: 400 });
      }

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
    if (!normalizedAddress.name || !normalizedAddress.phone || !normalizedAddress.address) {
      return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
    }

    const storeSettings = await getStoreSettings();
    const shippingFee = calculateShippingFee(totalPrice, storeSettings);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRES_MINUTES * 60 * 1000).toISOString();
    const orderId = crypto.randomUUID();
    const nowIso = now.toISOString();

    const { error: insertError } = await supabaseAdmin.from('orders').insert({
      order_id: orderId,
      user_id: decoded.uid,
      status: 'pending',
      shipping_status: 'ready',
      items: orderItems,
      total_price: totalPrice,
      shipping_fee: shippingFee,
      shipping_address: normalizedAddress,
      payment_key: null,
      created_at: nowIso,
      updated_at: nowIso,
      expires_at: expiresAt,
      paid_at: null,
      cancelled_at: null,
      delivered_at: null,
      return_status: 'none',
      return_reason: null,
    });
    if (insertError) throw insertError;

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
      expiresAt,
    });
  } catch (e) {
    console.error('[api/order/create]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
