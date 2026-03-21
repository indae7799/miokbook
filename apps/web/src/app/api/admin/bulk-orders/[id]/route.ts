import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken || !adminAuth) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request);

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { id } = params;
    const { data, error } = await supabaseAdmin
      .from('bulk_orders')
      .select('id, organization, contact_name, phone, email, delivery_date, status, books, notes, created_at, quote, contract')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[admin/bulk-orders/[id] GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const contract =
      data.contract && typeof data.contract === 'object' && !Array.isArray(data.contract)
        ? (data.contract as Record<string, unknown>)
        : null;

    const base = {
      id: data.id,
      organization: data.organization ?? '',
      contactName: data.contact_name ?? '',
      deliveryDate: data.delivery_date ?? '',
      status: data.status ?? 'pending',
      books: Array.isArray(data.books) ? data.books : [],
      notes: data.notes ?? '',
      createdAt: data.created_at ?? null,
      quote: data.quote ?? null,
      contract: contract
        ? {
            signedByEul: Boolean(contract.signedByEul),
            signedAtEul: typeof contract.signedAtEul === 'string' ? contract.signedAtEul : null,
            eulName: typeof contract.eulName === 'string' ? contract.eulName : null,
          }
        : null,
    };

    if (admin) {
      return NextResponse.json({
        ...base,
        phone: data.phone ?? '',
        email: data.email ?? '',
      });
    }

    return NextResponse.json(base);
  } catch (e) {
    console.error('[admin/bulk-orders/[id] GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { id } = params;
    const body = await request.json() as {
      quote?: {
        items: Array<{ title: string; isbn: string; quantity: number; unitPrice: number; total: number }>;
        shippingFee: number;
        totalAmount: number;
        validUntil: string;
        memo: string;
      };
      status?: string;
    };

    const updateData: Record<string, unknown> = {};

    if (body.quote) {
      updateData.quote = {
        ...body.quote,
        issuedAt: new Date().toISOString(),
      };
      updateData.status = 'quoted';
    }

    if (body.status) {
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('bulk_orders')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      console.error('[admin/bulk-orders/[id] PATCH] existing', existingError);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('bulk_orders')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[admin/bulk-orders/[id] PATCH] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/bulk-orders/[id] PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
