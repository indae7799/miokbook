import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { invalidate } from '@/lib/firestore-cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.confirm !== true) {
      return NextResponse.json({ error: 'CONFIRM_REQUIRED' }, { status: 400 });
    }

    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('event_id, type')
      .eq('type', 'book_concert');

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    const bookConcertIds = (events ?? []).map((event) => event.event_id);
    let deletedRegistrations = 0;

    for (const eventId of bookConcertIds) {
      const { count } = await supabaseAdmin
        .from('event_registrations')
        .select('registration_id', { count: 'exact', head: true })
        .eq('event_id', eventId);
      deletedRegistrations += count ?? 0;

      const { error: deleteError } = await supabaseAdmin
        .from('event_registrations')
        .delete()
        .eq('event_id', eventId);
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    if (bookConcertIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('events')
        .update({ registered_count: 0, updated_at: new Date().toISOString() })
        .in('event_id', bookConcertIds);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    invalidate('events');
    invalidate('event');

    return NextResponse.json({
      success: true,
      bookConcertEventCount: bookConcertIds.length,
      deletedRegistrations,
    });
  } catch (e) {
    console.error('[admin/concerts/purge-registrations POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
