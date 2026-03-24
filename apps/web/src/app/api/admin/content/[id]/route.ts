import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NOTICE_ARTICLE_TYPE } from '@/lib/articles';
import { CMS_HOME_CACHE_TAG } from '@/lib/cache-tags';
import { invalidate } from '@/lib/firestore-cache';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidateCmsHomeMemCache } from '@/lib/store/home';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_ARTICLE_TYPES = ['author_interview', 'bookstore_story', 'publisher_story', NOTICE_ARTICLE_TYPE];

function refreshArticleCaches(slugs: string[]) {
  invalidate('articles');
  invalidate('article');
  invalidateCmsHomeMemCache();
  revalidateTag(CMS_HOME_CACHE_TAG);
  revalidatePath('/');
  revalidatePath('/content');
  revalidatePath('/notices');
  revalidatePath('/sitemap.xml');
  for (const slug of slugs.filter(Boolean)) {
    revalidatePath(`/content/${slug}`);
    revalidatePath(`/notices/${slug}`);
  }
}

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
      .select('article_id, slug')
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
    if (ALLOWED_ARTICLE_TYPES.includes(body.type)) updates.type = body.type;
    if (typeof body.content === 'string') updates.content = body.content;
    if (typeof body.thumbnailUrl === 'string') updates.thumbnail_url = body.thumbnailUrl.trim();
    if (typeof body.isPublished === 'boolean') updates.is_published = body.isPublished;

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('articles').update(updates).eq('article_id', id);
    if (error) throw error;
    refreshArticleCaches([
      typeof existing.slug === 'string' ? existing.slug : '',
      typeof updates.slug === 'string' ? updates.slug : '',
    ]);
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
      .select('article_id, slug')
      .eq('article_id', id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const { error } = await supabaseAdmin.from('articles').delete().eq('article_id', id);
    if (error) throw error;
    refreshArticleCaches([typeof existing.slug === 'string' ? existing.slug : '']);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/content/[id] DELETE]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
