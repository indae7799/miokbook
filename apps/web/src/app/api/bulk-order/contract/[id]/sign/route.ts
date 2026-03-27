import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  buildBulkContractSnapshot,
  type BulkContractOrderSnapshot,
  type BulkContractQuoteSnapshot,
} from '@/lib/bulk-contract';
import { getRequestIp, hashBulkContractSnapshot } from '@/lib/bulk-contract-server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json() as {
      name?: string;
      agreedToElectronicContract?: boolean;
      agreedToOrderAndPricing?: boolean;
    };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: '서명자 이름이 필요합니다.' }, { status: 400 });
    }
    if (!body.agreedToElectronicContract || !body.agreedToOrderAndPricing) {
      return NextResponse.json({ error: '계약 체결을 위한 필수 동의가 누락되었습니다.' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('bulk_orders')
      .select('id, organization, contact_name, email, phone, delivery_date, notes, created_at, quote, contract')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      console.error('[bulk-order/contract/sign PATCH] existing', existingError);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const contract =
      existing.contract && typeof existing.contract === 'object' && !Array.isArray(existing.contract)
        ? (existing.contract as Record<string, unknown>)
        : {};

    if (contract.signedByEul === true) {
      return NextResponse.json({ error: '이미 서명된 계약서입니다.' }, { status: 409 });
    }

    const orderSnapshot: BulkContractOrderSnapshot = {
      orderId: existing.id,
      organization: String(existing.organization ?? ''),
      contactName: String(existing.contact_name ?? ''),
      email: String(existing.email ?? ''),
      phone: String(existing.phone ?? ''),
      deliveryDate: String(existing.delivery_date ?? ''),
      notes: String(existing.notes ?? ''),
      createdAt: typeof existing.created_at === 'string' ? existing.created_at : null,
    };

    const rawQuote =
      existing.quote && typeof existing.quote === 'object' && !Array.isArray(existing.quote)
        ? (existing.quote as Record<string, unknown>)
        : null;

    const quoteSnapshot: BulkContractQuoteSnapshot | null = rawQuote
      ? {
          items: Array.isArray(rawQuote.items)
            ? rawQuote.items.map((item) => {
                const row = item as Record<string, unknown>;
                return {
                  title: String(row.title ?? ''),
                  isbn: String(row.isbn ?? ''),
                  quantity: Number(row.quantity ?? 0),
                  unitPrice: Number(row.unitPrice ?? 0),
                  total: Number(row.total ?? 0),
                };
              })
            : [],
          shippingFee: Number(rawQuote.shippingFee ?? 0),
          totalAmount: Number(rawQuote.totalAmount ?? 0),
          validUntil: String(rawQuote.validUntil ?? ''),
          memo: String(rawQuote.memo ?? ''),
          issuedAt: typeof rawQuote.issuedAt === 'string' ? rawQuote.issuedAt : undefined,
        }
      : null;

    const snapshot = buildBulkContractSnapshot({
      order: orderSnapshot,
      quote: quoteSnapshot,
    });
    const signedAt = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('bulk_orders')
      .update({
        contract: {
          ...contract,
          signedByEul: true,
          signedAtEul: signedAt,
          eulName: name,
          version: snapshot.version,
          title: snapshot.title,
          snapshot,
          contentHash: hashBulkContractSnapshot(snapshot),
          auditTrail: {
            signedAt,
            signerName: name,
            signerIp: getRequestIp(request),
            signerUserAgent: request.headers.get('user-agent'),
            agreedToElectronicContract: true,
            agreedToOrderAndPricing: true,
          },
        },
        status: 'contracted',
      })
      .eq('id', id);

    if (error) {
      console.error('[bulk-order/contract/sign PATCH] update', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[bulk-order/contract/sign PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
