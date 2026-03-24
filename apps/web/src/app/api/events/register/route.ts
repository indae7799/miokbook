import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidate } from '@/lib/firestore-cache';
import { isEventClosed } from '@/lib/event-date';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function registrationDocId(eventId: string, uid: string): string {
  const safe = eventId.replace(/\//g, '_');
  return `${safe}__${uid}`;
}

function currentRetentionQuarter(d = new Date()): string {
  const y = d.getFullYear();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await request.json().catch(() => ({}));
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    const eventTitle = typeof body.eventTitle === 'string' ? body.eventTitle.trim().slice(0, 200) : '';
    const privacyAccepted = body.privacyAccepted === true;
    const phoneOverride = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim().slice(0, 40) : '';
    const address = typeof body.address === 'string' ? body.address.trim().slice(0, 500) : '';

    if (!eventId) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    if (!privacyAccepted) return NextResponse.json({ error: 'PRIVACY_REQUIRED' }, { status: 400 });

    // verifyIdToken에서 이미 디코딩된 클레임 사용 (별도 getUser 호출 불필요)
    const userName = (decoded.name ?? decoded.displayName ?? '').toString().trim().slice(0, 100);
    const userEmail = (decoded.email ?? '').toString().trim().slice(0, 200);
    const phone = phoneOverride || (decoded.phone_number ?? '').toString().replace(/\s/g, '').slice(0, 40);

    const registrationId = registrationDocId(eventId, uid);
    const retentionQuarter = currentRetentionQuarter();

    const [{ data: existingReg, error: regError }, { data: eventRow, error: eventError }] = await Promise.all([
      supabaseAdmin
        .from('event_registrations')
        .select('*')
        .eq('registration_id', registrationId)
        .maybeSingle(),
      supabaseAdmin
        .from('events')
        .select('event_id, date, capacity, registered_count')
        .eq('event_id', eventId)
        .maybeSingle(),
    ]);

    if (regError) throw regError;
    if (eventError) throw eventError;

    if (existingReg?.status === 'registered') {
      return NextResponse.json({ error: 'ALREADY_REGISTERED' }, { status: 409 });
    }
    if (eventRow) {
      if (isEventClosed(String(eventRow.date ?? ''))) {
        return NextResponse.json({ error: 'EVENT_CLOSED' }, { status: 409 });
      }
      const cap = Number(eventRow.capacity ?? 0);
      const cnt = Number(eventRow.registered_count ?? 0);
      if (cap > 0 && cnt >= cap) {
        return NextResponse.json({ error: 'EVENT_FULL' }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    const { error: upsertError } = await supabaseAdmin.from('event_registrations').upsert({
      registration_id: registrationId,
      event_id: eventId,
      event_title: eventTitle,
      user_id: uid,
      user_name: userName,
      user_email: userEmail,
      phone,
      address,
      status: 'registered',
      privacy_accepted: true,
      retention_quarter: retentionQuarter,
      created_at: existingReg?.created_at ?? now,
      updated_at: now,
      cancelled_at: null,
      cancel_reason: '',
    });
    if (upsertError) throw upsertError;

    if (eventRow) {
      const { error: eventUpdateError } = await supabaseAdmin
        .from('events')
        .update({
          registered_count: Number(eventRow.registered_count ?? 0) + 1,
          updated_at: now,
        })
        .eq('event_id', eventId);
      if (eventUpdateError) throw eventUpdateError;
    }

    invalidate('events');
    invalidate('event');

    return NextResponse.json({ success: true, registrationId });
  } catch (e) {
    console.error('[events/register POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
