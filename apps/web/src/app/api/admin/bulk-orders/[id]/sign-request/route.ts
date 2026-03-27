import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { createUcanSignDocumentFromTemplate } from '@/lib/ucansign';
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

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const templateDocumentId = process.env.UCANSIGN_TEMPLATE_DOCUMENT_ID?.trim();
    if (!templateDocumentId) {
      return NextResponse.json(
        { error: 'UCANSIGN_TEMPLATE_DOCUMENT_ID is not configured' },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      method?: 'embedding' | 'kakao';
    };
    const signMethod = body.method === 'kakao' ? 'kakao' : 'embedding';

    const { id } = params;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('bulk_orders')
      .select('id, organization, contact_name, email, phone, quote, contract')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      console.error('[admin/bulk-orders/[id]/sign-request POST] existing', existingError);
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
      return NextResponse.json({ error: 'ALREADY_SIGNED' }, { status: 409 });
    }

    const contactName = String(existing.contact_name ?? '').trim();
    const organization = String(existing.organization ?? '').trim();
    const phone = normalizePhone(String(existing.phone ?? ''));
    const email = String(existing.email ?? '').trim();

    if (!contactName) {
      return NextResponse.json({ error: 'CONTACT_NAME_REQUIRED' }, { status: 400 });
    }

    if (signMethod === 'kakao' && !phone) {
      return NextResponse.json({ error: 'PHONE_REQUIRED_FOR_KAKAO' }, { status: 400 });
    }

    if (signMethod === 'embedding' && !email && !phone) {
      return NextResponse.json({ error: 'CONTACT_INFO_REQUIRED' }, { status: 400 });
    }

    const quote =
      existing.quote && typeof existing.quote === 'object' && !Array.isArray(existing.quote)
        ? (existing.quote as Record<string, unknown>)
        : null;
    const totalAmount = Number(quote?.totalAmount ?? 0);
    const documentName = `[미옥서원] 도서 납품 계약서 - ${organization || contactName} (${id.slice(0, 8)})`;

    const result = await createUcanSignDocumentFromTemplate({
      templateDocumentId,
      documentName,
      isSendMessage: signMethod === 'kakao',
      participants: [
        {
          name: contactName,
          signingMethodType: signMethod === 'kakao' ? 'kakao' : 'none',
          ...(signMethod === 'kakao' ? { signingContactInfo: phone } : {}),
          signingOrder: 1,
          message:
            signMethod === 'kakao'
              ? `${organization || contactName} 계약서 서명을 진행해 주세요.`
              : `${organization || contactName} 계약서 서명을 진행해 주세요.`,
        },
      ],
      customValue: id,
      customValue1: organization,
      customValue2: contactName,
      customValue3: totalAmount ? String(totalAmount) : '',
      customValue4: signMethod,
      customValue5: email || phone,
    });

    const signerParticipant =
      result.participants?.find((participant) => participant.participantRole === 'participant') ??
      result.participants?.[0] ??
      null;

    const nextContract = {
      ...contract,
      signMethod,
      ucansignDocumentId: result.documentId,
      ucansignRequestId: result.documentId,
      ucansignParticipantId: signerParticipant?.participantId ?? null,
      ucansignStatus: result.status,
      ucansignDocumentName: result.name,
    };

    const { error: updateError } = await supabaseAdmin
      .from('bulk_orders')
      .update({
        contract: nextContract,
      })
      .eq('id', id);

    if (updateError) {
      console.error('[admin/bulk-orders/[id]/sign-request POST] update', updateError);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      method: signMethod,
      documentId: result.documentId,
      participantId: signerParticipant?.participantId ?? null,
    });
  } catch (error) {
    console.error('[admin/bulk-orders/[id]/sign-request POST]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
