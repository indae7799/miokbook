import { NextResponse } from 'next/server';
import {
  buildBulkContractSnapshot,
  type BulkContractOrderSnapshot,
  type BulkContractQuoteSnapshot,
} from '@/lib/bulk-contract';
import { storeBulkContractFinalDocument } from '@/lib/bulk-contract-artifact';
import { hashBulkContractSnapshot } from '@/lib/bulk-contract-server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const parsed = asString(value);
    if (parsed) return parsed;
  }
  return null;
}

function getNested(record: JsonRecord | null, ...path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    const next = asRecord(current);
    if (!next) return null;
    current = next[key];
  }
  return current;
}

function matchesConfiguredSecret(request: Request): boolean {
  const expected = process.env.UCANSIGN_WEBHOOK_SECRET?.trim();
  if (!expected) return true;

  const candidates = [
    request.headers.get('x-ucansign-webhook-secret'),
    request.headers.get('x-ucansign-secret'),
    request.headers.get('x-webhook-secret'),
    request.headers.get('x-api-key'),
  ];

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    candidates.push(authHeader.slice(7).trim());
  }

  return candidates.some((candidate) => candidate?.trim() === expected);
}

function isCompletionEvent(body: JsonRecord | null): boolean {
  const eventLike = [
    body?.event,
    body?.eventType,
    body?.type,
    body?.name,
    getNested(body, 'event', 'type'),
    getNested(body, 'data', 'event'),
    body?.status,
    getNested(body, 'data', 'status'),
    getNested(body, 'document', 'status'),
    getNested(body, 'request', 'status'),
  ]
    .map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
    .filter(Boolean);

  return eventLike.some((value) =>
    ['signing_completed', 'signing_completed_all', 'complete', 'completed', 'signed', 'done', 'finish', 'finished'].some((token) =>
      value.includes(token),
    ),
  );
}

function extractIdentifiers(body: JsonRecord | null) {
  return {
    requestId: firstString(
      body?.requestId,
      body?.signRequestId,
      getNested(body, 'request', 'id'),
      getNested(body, 'data', 'requestId'),
      getNested(body, 'data', 'signRequestId'),
    ),
    documentId: firstString(
      body?.documentId,
      body?.documentIdStr,
      body?.docId,
      getNested(body, 'document', 'id'),
      getNested(body, 'data', 'documentId'),
      getNested(body, 'data', 'docId'),
    ),
  };
}

function extractSignerName(body: JsonRecord | null, fallbackName: string): string {
  return (
    firstString(
      body?.signerName,
      body?.name,
      getNested(body, 'signer', 'name'),
      getNested(body, 'recipient', 'name'),
      getNested(body, 'data', 'signerName'),
    ) ?? fallbackName
  );
}

function extractSignedAt(body: JsonRecord | null): string {
  return (
    firstString(
      body?.signedAt,
      body?.completedAt,
      getNested(body, 'data', 'signedAt'),
      getNested(body, 'data', 'completedAt'),
      getNested(body, 'document', 'signedAt'),
    ) ?? new Date().toISOString()
  );
}

function extractAuditFlags(body: JsonRecord | null) {
  return {
    agreedToElectronicContract:
      asBoolean(body?.agreedToElectronicContract) ??
      asBoolean(getNested(body, 'data', 'agreedToElectronicContract')) ??
      true,
    agreedToOrderAndPricing:
      asBoolean(body?.agreedToOrderAndPricing) ??
      asBoolean(getNested(body, 'data', 'agreedToOrderAndPricing')) ??
      true,
  };
}

function buildOrderSnapshot(existing: {
  id: string;
  organization: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  delivery_date: string | null;
  notes: string | null;
  created_at: string | null;
}): BulkContractOrderSnapshot {
  return {
    orderId: existing.id,
    organization: String(existing.organization ?? ''),
    contactName: String(existing.contact_name ?? ''),
    email: String(existing.email ?? ''),
    phone: String(existing.phone ?? ''),
    deliveryDate: String(existing.delivery_date ?? ''),
    notes: String(existing.notes ?? ''),
    createdAt: typeof existing.created_at === 'string' ? existing.created_at : null,
  };
}

function buildQuoteSnapshot(rawQuote: unknown): BulkContractQuoteSnapshot | null {
  const quote = asRecord(rawQuote);
  if (!quote) return null;

  return {
    items: Array.isArray(quote.items)
      ? quote.items.map((item) => {
          const row = asRecord(item) ?? {};
          return {
            title: String(row.title ?? ''),
            isbn: String(row.isbn ?? ''),
            quantity: Number(row.quantity ?? 0),
            unitPrice: Number(row.unitPrice ?? 0),
            total: Number(row.total ?? 0),
          };
        })
      : [],
    shippingFee: Number(quote.shippingFee ?? 0),
    totalAmount: Number(quote.totalAmount ?? 0),
    validUntil: String(quote.validUntil ?? ''),
    memo: String(quote.memo ?? ''),
    issuedAt: typeof quote.issuedAt === 'string' ? quote.issuedAt : undefined,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: 'ucansign',
    message: 'Webhook endpoint is ready',
  });
}

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    if (!matchesConfiguredSecret(request)) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const rawBody = await request.text();
    const body = rawBody ? (JSON.parse(rawBody) as JsonRecord) : null;

    if (!isCompletionEvent(body)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const { requestId, documentId } = extractIdentifiers(body);
    const customOrderId = firstString(
      body?.customValue,
      body?.customValue1,
      getNested(body, 'data', 'customValue'),
      getNested(body, 'data', 'customValue1'),
    );

    if (!requestId && !documentId && !customOrderId) {
      console.error('[webhooks/ucansign POST] missing identifiers', body);
      return NextResponse.json({ error: 'MISSING_IDENTIFIERS' }, { status: 400 });
    }

    const query = supabaseAdmin
      .from('bulk_orders')
      .select('id, organization, contact_name, email, phone, delivery_date, notes, created_at, quote, contract')
      .limit(500);

    const { data: orders, error: selectError } = customOrderId
      ? await query.eq('id', customOrderId)
      : await query;

    if (selectError) {
      console.error('[webhooks/ucansign POST] select', selectError);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const existing = (orders ?? []).find((row) => {
      const contract = asRecord(row.contract);
      const rowRequestId = asString(contract?.ucansignRequestId);
      const rowDocumentId = asString(contract?.ucansignDocumentId);
      return (
        row.id === customOrderId ||
        (requestId && rowRequestId === requestId) ||
        (documentId && rowDocumentId === documentId)
      );
    });

    if (!existing) {
      console.error('[webhooks/ucansign POST] order not found', { requestId, documentId });
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const contract = asRecord(existing.contract) ?? {};
    if (contract.signedByEul === true) {
      return NextResponse.json({ ok: true, alreadySigned: true });
    }

    const snapshot =
      (asRecord(contract.snapshot) as unknown as ReturnType<typeof buildBulkContractSnapshot>) ??
      buildBulkContractSnapshot({
        order: buildOrderSnapshot(existing),
        quote: buildQuoteSnapshot(existing.quote),
      });

    const signedAt = extractSignedAt(body);
    const signerName = extractSignerName(body, String(existing.contact_name ?? '서명자'));
    const contentHash = hashBulkContractSnapshot(snapshot);
    const auditFlags = extractAuditFlags(body);
    const auditTrail = {
      signedAt,
      signerName,
      signerIp: firstString(
        body?.signerIp,
        body?.participantContactInfo,
        getNested(body, 'signer', 'ip'),
        getNested(body, 'data', 'signerIp'),
      ),
      signerUserAgent: firstString(
        body?.signerUserAgent,
        getNested(body, 'signer', 'userAgent'),
        getNested(body, 'data', 'signerUserAgent'),
      ),
      agreedToElectronicContract: auditFlags.agreedToElectronicContract,
      agreedToOrderAndPricing: auditFlags.agreedToOrderAndPricing,
    };

    let finalDocument = null;
    try {
      finalDocument = await storeBulkContractFinalDocument({
        orderId: existing.id,
        signerName,
        signedAt,
        contentHash,
        snapshot,
        auditTrail,
      });
    } catch (artifactError) {
      console.error('[webhooks/ucansign POST] final document', artifactError);
    }

    const { error: updateError } = await supabaseAdmin
      .from('bulk_orders')
      .update({
        contract: {
          ...contract,
          signedByEul: true,
          signedAtEul: signedAt,
          eulName: signerName,
          version: snapshot.version,
          title: snapshot.title,
          contentHash,
          auditTrail,
          finalDocument,
          ...(requestId ? { ucansignRequestId: requestId } : {}),
          ...(documentId ? { ucansignDocumentId: documentId } : {}),
          ...(body?.participantIdStr ? { ucansignParticipantId: body.participantIdStr } : {}),
        },
        status: 'contracted',
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('[webhooks/ucansign POST] update', updateError);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      orderId: existing.id,
    });
  } catch (error) {
    console.error('[webhooks/ucansign POST]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
