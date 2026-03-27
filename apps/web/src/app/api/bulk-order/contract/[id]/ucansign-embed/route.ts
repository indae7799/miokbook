import { NextResponse } from 'next/server';
import { getUcanSignEmbeddingUrl } from '@/lib/ucansign';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { id } = params;
    const { data, error } = await supabaseAdmin
      .from('bulk_orders')
      .select('id, contract')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[bulk-order/contract/[id]/ucansign-embed GET] select', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const contract =
      data.contract && typeof data.contract === 'object' && !Array.isArray(data.contract)
        ? (data.contract as Record<string, unknown>)
        : null;

    const documentId = typeof contract?.ucansignDocumentId === 'string' ? contract.ucansignDocumentId : null;
    const participantId =
      typeof contract?.ucansignParticipantId === 'string' ? contract.ucansignParticipantId : null;

    if (!documentId) {
      return NextResponse.json({ error: 'UCANSIGN_DOCUMENT_NOT_READY' }, { status: 409 });
    }

    const origin = new URL(request.url).origin;
    const redirectUrl = `${origin}/bulk-order/contract/${id}`;
    const result = await getUcanSignEmbeddingUrl({
      documentId,
      participantId,
      redirectUrl,
    });

    return NextResponse.json({
      ok: true,
      url: result.url,
      expiration: result.expiration,
    });
  } catch (error) {
    console.error('[bulk-order/contract/[id]/ucansign-embed GET]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
