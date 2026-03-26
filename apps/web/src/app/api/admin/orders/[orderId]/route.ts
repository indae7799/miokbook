import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveDisplayOrderId } from '@/lib/order-id';

export const dynamic = 'force-dynamic';

const SHIPPING_STATUSES = ['ready', 'shipped', 'delivered'] as const;
const TRACKING_NUMBER_MAX_LENGTH = 50;
const CARRIER_MAX_LENGTH = 50;
type OrderItem = { isbn?: string; quantity?: number };
type AdminActor = { uid?: string; email?: string; name?: string | null };

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

async function updateOrderWithCompatibility(orderId: string, payload: Record<string, unknown>) {
  const updatePayload = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { error } = await supabaseAdmin.from('orders').update(updatePayload).eq('order_id', orderId);
    if (!error) return;
    if (!hasMissingColumnError(error)) throw error;
    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !(missingColumn in updatePayload)) throw error;
    delete updatePayload[missingColumn];
  }
  throw new Error('ORDER_COMPAT_UPDATE_FAILED');
}

async function insertAdminOrderLog(
  actor: AdminActor,
  orderId: string,
  action: string,
  description: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    const { error } = await supabaseAdmin.from('order_admin_logs').insert({
      order_id: orderId,
      actor_uid: actor.uid ?? null,
      actor_email: actor.email ?? null,
      actor_name: actor.name ?? null,
      action,
      description,
      metadata,
    });
    if (error) {
      console.warn('[admin/orders log insert skipped]', error);
    }
  } catch (error) {
    console.warn('[admin/orders log insert failed]', error);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { data: row, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) throw error;
    if (!row) return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });

    const shippingAddress =
      row.shipping_address && typeof row.shipping_address === 'object' && !Array.isArray(row.shipping_address)
        ? (row.shipping_address as Record<string, unknown>)
        : {};

    const itemList = Array.isArray(row.items)
      ? (row.items as Array<{ title?: string; quantity?: number; unitPrice?: number; isbn?: string }>)
      : [];

    let logs: Array<Record<string, unknown>> = [];
    try {
      const { data: logRows, error: logError } = await supabaseAdmin
        .from('order_admin_logs')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (logError) {
        console.warn('[admin/orders GET detail logs skipped]', logError);
      } else {
        logs = (logRows ?? []).map((log) => ({
          id: log.id,
          action: log.action,
          description: log.description,
          actorUid: log.actor_uid,
          actorEmail: log.actor_email,
          actorName: log.actor_name,
          metadata: log.metadata,
          createdAt: log.created_at,
        }));
      }
    } catch (error) {
      console.warn('[admin/orders GET detail logs failed]', error);
    }

    return NextResponse.json({
      id: row.order_id,
      orderId: row.order_id,
      displayOrderId: resolveDisplayOrderId(row),
      userId: row.user_id,
      status: row.status,
      shippingStatus: row.shipping_status,
      items: itemList,
      totalPrice: Number(row.total_price ?? 0),
      shippingFee: Number(row.shipping_fee ?? 0),
      shippingAddress: {
        name: typeof shippingAddress.name === 'string' ? shippingAddress.name : '',
        phone: typeof shippingAddress.phone === 'string' ? shippingAddress.phone : '',
        address: typeof shippingAddress.address === 'string' ? shippingAddress.address : '',
        detailAddress: typeof shippingAddress.detailAddress === 'string' ? shippingAddress.detailAddress : '',
      },
      deliveryMemo:
        typeof row.delivery_memo === 'string'
          ? row.delivery_memo
          : typeof shippingAddress.deliveryMemo === 'string'
            ? shippingAddress.deliveryMemo
            : '',
      promotionCode:
        typeof row.promotion_code === 'string'
          ? row.promotion_code
          : typeof shippingAddress.promotionCode === 'string'
            ? shippingAddress.promotionCode
            : '',
      promotionLabel:
        typeof row.promotion_label === 'string'
          ? row.promotion_label
          : typeof shippingAddress.promotionLabel === 'string'
            ? shippingAddress.promotionLabel
            : '',
      promotionDiscount: Number(row.promotion_discount ?? shippingAddress.promotionDiscount ?? 0),
      pointsUsed: Number(row.points_used ?? 0),
      pointsEarned: Number(row.points_earned ?? 0),
      payableAmount: Number(
        row.payable_amount ??
          Number(row.total_price ?? 0) +
            Number(row.shipping_fee ?? 0) -
            Number(row.promotion_discount ?? shippingAddress.promotionDiscount ?? 0) -
            Number(row.points_used ?? 0)
      ),
      trackingNumber: row.tracking_number ?? null,
      carrier: row.carrier ?? null,
      createdAt: row.created_at ?? null,
      paidAt: row.paid_at ?? null,
      deliveredAt: row.delivered_at ?? null,
      returnStatus: row.return_status ?? 'none',
      returnReason: row.return_reason ?? null,
      exchangeReason: row.exchange_reason ?? null,
      adminLogs: logs,
    });
  } catch (e) {
    console.error('[admin/orders GET detail]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    const actor = {
      uid: decoded.uid,
      email: decoded.email,
      name:
        typeof (decoded as { name?: string }).name === 'string'
          ? (decoded as { name?: string }).name
          : typeof (decoded as { displayName?: string }).displayName === 'string'
            ? (decoded as { displayName?: string }).displayName
            : null,
    };

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const shippingStatus = body.shippingStatus as string | undefined;
    const returnStatusUpdate = body.returnStatus as string | undefined;
    const exchangeStatusUpdate = body.exchangeStatus as string | undefined;
    const trackingNumber = typeof body.trackingNumber === 'string'
      ? body.trackingNumber.trim().slice(0, TRACKING_NUMBER_MAX_LENGTH)
      : undefined;
    const carrier = typeof body.carrier === 'string'
      ? body.carrier.trim().slice(0, CARRIER_MAX_LENGTH)
      : undefined;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });

    const items = ((order.items ?? []) as OrderItem[]).filter(Boolean);
    const now = new Date().toISOString();

    if (returnStatusUpdate === 'completed') {
      if (order.status !== 'return_requested' && order.return_status !== 'requested') {
        return NextResponse.json({ error: 'INVALID_STATE_FOR_RETURN_COMPLETE' }, { status: 400 });
      }

      for (const item of items) {
        const isbn = String(item.isbn ?? '').trim();
        const qty = Math.max(0, Math.min(100, Number(item.quantity) ?? 1));
        if (!isbn) continue;
        const [{ data: inventoryRow }, { data: bookRow }] = await Promise.all([
          supabaseAdmin.from('inventory').select('*').eq('isbn', isbn).maybeSingle(),
          supabaseAdmin.from('books').select('sales_count').eq('isbn', isbn).maybeSingle(),
        ]);
        await supabaseAdmin.from('inventory').upsert({
          isbn,
          stock: Number(inventoryRow?.stock ?? 0) + qty,
          reserved: Number(inventoryRow?.reserved ?? 0),
          updated_at: now,
        });
        if (bookRow) {
          await supabaseAdmin
            .from('books')
            .update({
              sales_count: Math.max(0, Number(bookRow.sales_count ?? 0) - qty),
              updated_at: now,
            })
            .eq('isbn', isbn);
        }
      }

      await supabaseAdmin
        .from('orders')
        .update({
          return_status: 'completed',
          status: 'return_completed',
          return_completed_at: now,
          updated_at: now,
        })
        .eq('order_id', orderId);

      await insertAdminOrderLog(actor, orderId, 'return_completed', '반품 완료 처리', {
        previousStatus: order.status,
        previousReturnStatus: order.return_status,
      });

      invalidateStoreBookListsAndHome();
      return NextResponse.json({ ok: true });
    }

    if (exchangeStatusUpdate === 'completed') {
      if (order.status !== 'exchange_requested') {
        return NextResponse.json({ error: 'INVALID_STATE_FOR_EXCHANGE_COMPLETE' }, { status: 400 });
      }

      await supabaseAdmin
        .from('orders')
        .update({
          status: 'exchange_completed',
          exchange_completed_at: now,
          updated_at: now,
        })
        .eq('order_id', orderId);

      await insertAdminOrderLog(actor, orderId, 'exchange_completed', '교환 완료 처리', {
        previousStatus: order.status,
      });

      return NextResponse.json({ ok: true });
    }

    const updates: Record<string, unknown> = { updated_at: now };
    if (shippingStatus && SHIPPING_STATUSES.includes(shippingStatus as (typeof SHIPPING_STATUSES)[number])) {
      const nextTrackingNumber = trackingNumber !== undefined ? trackingNumber : order.tracking_number;
      const nextCarrier = carrier !== undefined ? carrier : order.carrier;
      if (shippingStatus === 'shipped' && (!nextTrackingNumber || !nextCarrier)) {
        return NextResponse.json({ error: 'TRACKING_INFO_REQUIRED' }, { status: 400 });
      }
      updates.shipping_status = shippingStatus;
      if (shippingStatus === 'delivered') updates.delivered_at = now;
    }
    if (trackingNumber !== undefined) updates.tracking_number = trackingNumber || null;
    if (carrier !== undefined) updates.carrier = carrier || null;

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await updateOrderWithCompatibility(orderId, updates);

    const changedFields = Object.entries(updates)
      .filter(([key]) => key !== 'updated_at')
      .reduce<Record<string, unknown>>((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    const action =
      shippingStatus === 'shipped'
        ? 'shipping_started'
        : shippingStatus === 'delivered'
          ? 'shipping_completed'
          : trackingNumber !== undefined || carrier !== undefined
            ? 'tracking_updated'
            : 'order_updated';

    const description =
      shippingStatus === 'shipped'
        ? '배송중 처리'
        : shippingStatus === 'delivered'
          ? '배송완료 처리'
          : trackingNumber !== undefined || carrier !== undefined
            ? '택배사 또는 송장정보 수정'
            : '주문 정보 수정';

    await insertAdminOrderLog(actor, orderId, action, description, changedFields);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/orders PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
