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
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const list = (data ?? []).map((row) => ({
      articleId: row.article_id,
      slug: row.slug ?? '',
      type: row.type ?? '',
      title: row.title ?? '',
      thumbnailUrl: row.thumbnail_url ?? '',
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    }));
    return NextResponse.json(list);
  } catch (e) {
    console.error('[admin/content GET]', e);
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
    const slug = typeof body.slug === 'string' ? body.slug.trim().replace(/\s+/g, '-') : '';
    const type = ['author_interview', 'bookstore_story', 'publisher_story'].includes(body.type) ? body.type : 'bookstore_story';
    const content = typeof body.content === 'string' ? body.content : '';
    const thumbnailUrl = typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl.trim() : '';
    const isPublished = body.isPublished === true;

    if (!title || !slug || !thumbnailUrl) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { data: existingSlug, error: slugError } = await supabaseAdmin
      .from('articles')
      .select('article_id')
      .eq('slug', slug)
      .maybeSingle();

    if (slugError) throw slugError;
    if (existingSlug) {
      return NextResponse.json({ error: 'SLUG_EXISTS' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({
        slug,
        type,
        title,
        content,
        thumbnail_url: thumbnailUrl,
        is_published: isPublished,
        created_at: now,
        updated_at: now,
      })
      .select('article_id')
      .single();

    if (error) throw error;
    return NextResponse.json({ articleId: data.article_id, ok: true });
  } catch (e) {
    console.error('[admin/content POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
