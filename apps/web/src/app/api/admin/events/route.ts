import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .order('date', { ascending: false, nullsFirst: false });

    if (error) throw error;

    const list = (data ?? []).map((row) => ({
      eventId: row.event_id,
      title: row.title ?? '',
      type: row.type ?? '',
      description: row.description ?? '',
      imageUrl: row.image_url ?? '',
      date: row.date ?? null,
      location: row.location ?? '',
      capacity: Number(row.capacity ?? 0),
      registeredCount: Number(row.registered_count ?? 0),
      isActive: Boolean(row.is_active),
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error('[admin/events GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const type = ['book_concert', 'author_talk', 'book_club'].includes(body.type) ? body.type : 'book_concert';
    const description = typeof body.description === 'string' ? body.description : '';
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    const capacity = Math.max(1, parseInt(String(body.capacity), 10) || 1);
    const isActive = body.isActive !== false;
    const dateStr = typeof body.date === 'string' ? body.date : '';
    const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

    if (!title || !imageUrl) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({
        title,
        type,
        description,
        image_url: imageUrl,
        date,
        location,
        capacity,
        registered_count: 0,
        is_active: isActive,
        created_at: now,
        updated_at: now,
      })
      .select('event_id')
      .single();

    if (error) throw error;
    return NextResponse.json({ eventId: data.event_id, ok: true });
  } catch (e) {
    console.error('[admin/events POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
