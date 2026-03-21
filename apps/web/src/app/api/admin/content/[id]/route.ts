import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('article_id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    return NextResponse.json({
      articleId: data.article_id,
      slug: data.slug ?? '',
      type: data.type ?? '',
      title: data.title ?? '',
      content: data.content ?? '',
      thumbnailUrl: data.thumbnail_url ?? '',
      isPublished: Boolean(data.is_published),
      createdAt: data.created_at ?? null,
      updatedAt: data.updated_at ?? null,
    });
  } catch (e) {
    console.error('[admin/content/[id] GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('articles')
      .select('article_id')
      .eq('article_id', id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
    if (typeof body.slug === 'string' && body.slug.trim()) {
      const slug = body.slug.trim().replace(/\s+/g, '-');
      const { data: slugDoc, error: slugError } = await supabaseAdmin
        .from('articles')
        .select('article_id')
        .eq('slug', slug)
        .maybeSingle();
      if (slugError) throw slugError;
      if (slugDoc && slugDoc.article_id !== id) {
        return NextResponse.json({ error: 'SLUG_EXISTS' }, { status: 409 });
      }
      updates.slug = slug;
    }
    if (['author_interview', 'bookstore_story', 'publisher_story'].includes(body.type)) updates.type = body.type;
    if (typeof body.content === 'string') updates.content = body.content;
    if (typeof body.thumbnailUrl === 'string' && body.thumbnailUrl.trim()) updates.thumbnail_url = body.thumbnailUrl.trim();
    if (typeof body.isPublished === 'boolean') updates.is_published = body.isPublished;

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('articles').update(updates).eq('article_id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/content/[id] PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('articles')
      .select('article_id')
      .eq('article_id', id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const { error } = await supabaseAdmin.from('articles').delete().eq('article_id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/content/[id] DELETE]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
