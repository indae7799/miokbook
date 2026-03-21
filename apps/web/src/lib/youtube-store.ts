import { getOrSet, TTL } from '@/lib/firestore-cache';
import { isUiDesignMode } from '@/lib/design-mode';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { coerceYoutubeContentPublished, getYoutubeThumbnail } from '@/types/youtube-content';

export interface YoutubeContentListItem {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
}

export async function getPublishedYoutubeContentsList(): Promise<YoutubeContentListItem[]> {
  if (isUiDesignMode()) return [];

  return getOrSet('youtubeContents', 'list', TTL.YOUTUBE_CONTENTS, async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('youtube_contents')
        .select('id, slug, title, youtube_id, thumbnail_url, is_published, order')
        .order('order', { ascending: true });

      if (error || !data) return [];

      return data
        .filter((row) => coerceYoutubeContentPublished(row.is_published))
        .map((row) => ({
          id: row.id,
          slug: String(row.slug ?? ''),
          title: String(row.title ?? ''),
          thumbnailUrl: row.thumbnail_url || (row.youtube_id ? getYoutubeThumbnail(String(row.youtube_id).trim(), 'hq') : ''),
        }));
    } catch (e) {
      console.error('[youtube-store] getPublishedYoutubeContentsList:', e);
      return [];
    }
  });
}
