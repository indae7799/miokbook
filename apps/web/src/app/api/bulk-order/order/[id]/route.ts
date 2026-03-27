import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BulkContractAuditTrail, BulkContractSnapshot } from '@/lib/bulk-contract';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
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

    const { data, error } = await supabaseAdmin
      .from('bulk_orders')
      .select('id, organization, contact_name, phone, email, delivery_date, books, notes, status, quote, contract, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[bulk-order/order GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const contract =
      data.contract && typeof data.contract === 'object' && !Array.isArray(data.contract)
        ? (data.contract as Record<string, unknown>)
        : null;

    return NextResponse.json({
      id: data.id,
      organization: data.organization ?? '',
      contactName: data.contact_name ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      deliveryDate: data.delivery_date ?? '',
      books: Array.isArray(data.books) ? data.books : [],
      notes: data.notes ?? '',
      status: data.status ?? 'pending',
      quote: data.quote ?? null,
      contract: contract
        ? {
            signedByEul: Boolean(contract.signedByEul),
            signedAtEul: typeof contract.signedAtEul === 'string' ? contract.signedAtEul : null,
            eulName: typeof contract.eulName === 'string' ? contract.eulName : null,
            signMethod: typeof contract.signMethod === 'string' ? contract.signMethod : null,
            ucansignRequestId: typeof contract.ucansignRequestId === 'string' ? contract.ucansignRequestId : null,
            ucansignDocumentId: typeof contract.ucansignDocumentId === 'string' ? contract.ucansignDocumentId : null,
            ucansignParticipantId:
              typeof contract.ucansignParticipantId === 'string' ? contract.ucansignParticipantId : null,
            version: typeof contract.version === 'string' ? contract.version : null,
            title: typeof contract.title === 'string' ? contract.title : null,
            contentHash: typeof contract.contentHash === 'string' ? contract.contentHash : null,
            finalDocument:
              contract.finalDocument && typeof contract.finalDocument === 'object' && !Array.isArray(contract.finalDocument)
                ? contract.finalDocument
                : null,
            snapshot:
              contract.snapshot && typeof contract.snapshot === 'object' && !Array.isArray(contract.snapshot)
                ? (contract.snapshot as BulkContractSnapshot)
                : null,
            auditTrail:
              contract.auditTrail && typeof contract.auditTrail === 'object' && !Array.isArray(contract.auditTrail)
                ? (contract.auditTrail as BulkContractAuditTrail)
                : null,
          }
        : null,
      createdAt: data.created_at ?? null,
    });
  } catch (e) {
    console.error('[bulk-order/order GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
