import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidate } from '@/lib/firestore-cache';
import { CMS_HOME_CACHE_TAG } from '@/lib/cache-tags';
import { invalidateCmsHomeMemCache } from '@/lib/store/home';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  type YoutubeContent,
  coerceYoutubeContentPublished,
  normalizeStringArray,
  normalizeYoutubeExposureTargets,
} from '@/types/youtube-content';

function normalizeOrder(raw: unknown): number {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  try {
    if (!adminAuth) return false;
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return false;
    const decoded = await adminAuth.verifyIdToken(token);
    return (decoded as { role?: string }).role === 'admin';
  } catch {
    return false;
  }
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function mapRow(row: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  youtube_id: string;
  external_playback_url: string | null;
  thumbnail_url: string | null;
  related_image_url?: string | null;
  is_published: boolean;
  sort_order: number | null;
  related_youtube_ids: string[] | null;
  related_isbns: string[] | null;
  exposure_targets: string[] | null;
  published_at: string | null;
  created_at: string;
}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    mainYoutubeId: row.youtube_id ?? '',
    externalPlaybackUrl: row.external_playback_url ?? '',
    relatedYoutubeIds: normalizeStringArray(row.related_youtube_ids),
    customThumbnailUrl: row.thumbnail_url ?? '',
    relatedImageUrl: row.related_image_url ?? '',
    exposureTargets: normalizeYoutubeExposureTargets(row.exposure_targets),
    relatedIsbns: normalizeStringArray(row.related_isbns),
    publishedAt: row.published_at ?? row.created_at,
    isPublished: coerceYoutubeContentPublished(row.is_published),
    order: normalizeOrder(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.created_at,
  } satisfies YoutubeContent;
}

function revalidateYoutubeContent() {
  invalidate('youtubeContents');
  invalidateCmsHomeMemCache();
  revalidateTag(CMS_HOME_CACHE_TAG);
  revalidatePath('/');
  revalidatePath('/content');
  revalidatePath('/concerts');
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) return unauthorized();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

  const primary = await supabaseAdmin
    .from('youtube_contents')
    .select('id, slug, title, description, youtube_id, external_playback_url, thumbnail_url, related_image_url, is_published, sort_order, related_youtube_ids, related_isbns, exposure_targets, published_at, created_at')
    .order('created_at', { ascending: false });

  if (!primary.error && primary.data) {
    return NextResponse.json(primary.data.map(mapRow));
  }

  const fallback = await supabaseAdmin
    .from('youtube_contents')
    .select('id, slug, title, description, youtube_id, thumbnail_url, is_published, sort_order, related_youtube_ids, related_isbns, exposure_targets, published_at, created_at')
    .order('created_at', { ascending: false });

  if (fallback.error) {
    console.error('[admin/youtube-content GET] supabase', primary.error ?? fallback.error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }

  return NextResponse.json(
    (fallback.data ?? []).map((row) =>
      mapRow({
        ...row,
        external_playback_url: '',
        related_image_url: '',
      }),
    ),
  );
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) return unauthorized();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

  const body = (await req.json()) as Omit<YoutubeContent, 'id'>;
  const { data, error } = await supabaseAdmin
    .from('youtube_contents')
    .insert({
      slug: body.slug,
      title: body.title,
      description: body.description ?? '',
      youtube_id: body.mainYoutubeId ?? '',
      external_playback_url: body.externalPlaybackUrl ?? '',
      thumbnail_url: body.customThumbnailUrl ?? '',
      related_image_url: body.relatedImageUrl ?? '',
      is_published: coerceYoutubeContentPublished(body.isPublished),
      sort_order: normalizeOrder(body.order),
      related_youtube_ids: body.relatedYoutubeIds ?? [],
      related_isbns: body.relatedIsbns ?? [],
      exposure_targets: normalizeYoutubeExposureTargets(body.exposureTargets),
      published_at: body.publishedAt ?? new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[admin/youtube-content POST] supabase', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }

  revalidateYoutubeContent();
  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await verifyAdmin(req))) return unauthorized();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

  const { id, ...body } = (await req.json()) as Partial<YoutubeContent> & { id: string };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.slug === 'string') patch.slug = body.slug;
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.description === 'string') patch.description = body.description;
  if (typeof body.mainYoutubeId === 'string') patch.youtube_id = body.mainYoutubeId;
  if (typeof body.externalPlaybackUrl === 'string') patch.external_playback_url = body.externalPlaybackUrl;
  if (typeof body.customThumbnailUrl === 'string') patch.thumbnail_url = body.customThumbnailUrl;
  if (typeof body.relatedImageUrl === 'string') patch.related_image_url = body.relatedImageUrl;
  if (Object.prototype.hasOwnProperty.call(body, 'isPublished')) patch.is_published = coerceYoutubeContentPublished(body.isPublished);
  if (Object.prototype.hasOwnProperty.call(body, 'order')) patch.sort_order = normalizeOrder(body.order);
  if (Array.isArray(body.relatedYoutubeIds)) patch.related_youtube_ids = body.relatedYoutubeIds;
  if (Array.isArray(body.relatedIsbns)) patch.related_isbns = body.relatedIsbns;
  if (Object.prototype.hasOwnProperty.call(body, 'exposureTargets')) {
    patch.exposure_targets = normalizeYoutubeExposureTargets(body.exposureTargets);
  }
  if (typeof body.publishedAt === 'string') patch.published_at = body.publishedAt;

  const { error } = await supabaseAdmin
    .from('youtube_contents')
    .update(patch)
    .eq('id', id);

  if (error) {
    console.error('[admin/youtube-content PUT] supabase', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }

  revalidateYoutubeContent();
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin(req))) return unauthorized();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('youtube_contents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[admin/youtube-content DELETE] supabase', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }

  revalidateYoutubeContent();
  return NextResponse.json({ success: true });
}
