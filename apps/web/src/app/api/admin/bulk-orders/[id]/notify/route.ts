import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendBulkOrderQuoteEmail, sendBulkOrderContractSignedEmail } from '@/lib/bulk-order-mailer';

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

export async function POST(
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

    const body = await request.json() as { kind?: 'quote' | 'contract' };
    const kind = body.kind;
    if (!kind) {
      return NextResponse.json({ error: 'Missing kind' }, { status: 400 });
    }

    const { id } = params;
    const { data, error } = await supabaseAdmin
      .from('bulk_orders')
      .select('id, organization, contact_name, email, quote, contract')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[admin/bulk-orders/[id]/notify POST] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (!data.email) {
      return NextResponse.json({ error: 'NO_EMAIL' }, { status: 400 });
    }

    const baseUrl = new URL(request.url).origin;

    if (kind === 'quote') {
      const quote =
        data.quote && typeof data.quote === 'object' && !Array.isArray(data.quote)
          ? (data.quote as {
              items: Array<{ title: string; isbn: string; quantity: number; unitPrice: number; total: number }>;
              shippingFee: number;
              totalAmount: number;
              validUntil: string;
              memo: string;
            })
          : null;
      if (!quote) {
        return NextResponse.json({ error: 'NO_QUOTE' }, { status: 400 });
      }
      await sendBulkOrderQuoteEmail({
        to: data.email,
        orderId: data.id,
        organization: data.organization ?? '',
        contactName: data.contact_name ?? '',
        quote,
        baseUrl,
      });
      return NextResponse.json({ ok: true });
    }

    const contract =
      data.contract && typeof data.contract === 'object' && !Array.isArray(data.contract)
        ? (data.contract as Record<string, unknown>)
        : null;
    const signedAt = typeof contract?.signedAtEul === 'string' ? contract.signedAtEul : null;
    const signerName = typeof contract?.eulName === 'string' ? contract.eulName : null;
    if (!signedAt || !signerName) {
      return NextResponse.json({ error: 'NO_SIGNED_CONTRACT' }, { status: 400 });
    }

    await sendBulkOrderContractSignedEmail({
      to: data.email,
      orderId: data.id,
      organization: data.organization ?? '',
      contactName: data.contact_name ?? '',
      signerName,
      signedAt,
      baseUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/bulk-orders/[id]/notify POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
