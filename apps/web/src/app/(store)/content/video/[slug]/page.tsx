import { notFound } from 'next/navigation';
import { youtubeContentSlugSearchVariants } from '@/lib/youtube-content-slug';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  type YoutubeContent,
  coerceYoutubeContentPublished,
  isSafeHttpUrl,
  normalizeStringArray,
  normalizeYoutubeExposureTargets,
} from '@/types/youtube-content';
import YoutubeContentViewer from '@/components/content/YoutubeContentViewer';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function YoutubeContentVideoPage({ params }: Props) {
  const { slug: slugParam } = await params;

  let content:
    | (YoutubeContent & {
        id: string;
        youtube_id?: string | null;
        thumbnail_url?: string | null;
        is_published?: boolean | string | number | null;
        related_isbns?: string[] | null;
        related_youtube_ids?: string[] | null;
        exposure_targets?: string[] | null;
        published_at?: string | null;
        created_at?: string | null;
      })
    | null = null;

  for (const slugTry of youtubeContentSlugSearchVariants(slugParam)) {
    const { data, error } = await supabaseAdmin
      .from('youtube_contents')
      .select('*')
      .eq('slug', slugTry)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) continue;
    const hit = data.find((row) => coerceYoutubeContentPublished(row.is_published));
    if (!hit) continue;

    content = {
      id: hit.id,
      slug: String(hit.slug ?? ''),
      title: String(hit.title ?? ''),
      description: hit.description ?? '',
      mainYoutubeId: String(hit.youtube_id ?? ''),
      externalPlaybackUrl: String((hit as { external_playback_url?: string | null }).external_playback_url ?? ''),
      relatedYoutubeIds: normalizeStringArray(hit.related_youtube_ids),
      exposureTargets: normalizeYoutubeExposureTargets(hit.exposure_targets),
      customThumbnailUrl: hit.thumbnail_url ?? '',
      relatedImageUrl: String((hit as { related_image_url?: string | null }).related_image_url ?? ''),
      relatedIsbns: normalizeStringArray(hit.related_isbns),
      publishedAt: hit.published_at ?? '',
      isPublished: coerceYoutubeContentPublished(hit.is_published),
      order: Number(
        (hit as { sort_order?: unknown; order?: unknown }).sort_order ??
          (hit as { order?: unknown }).order ??
          0,
      ),
      createdAt: hit.created_at ?? undefined,
    };
    break;
  }

  if (!content) notFound();

  const yt = String(content.mainYoutubeId ?? '').trim();
  const ext = String(content.externalPlaybackUrl ?? '').trim();
  const extOk = ext.length > 0 && isSafeHttpUrl(ext);
  if (!yt && !extOk) notFound();

  return <YoutubeContentViewer content={content} />;
}
