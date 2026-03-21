import { getOrSet, TTL } from '@/lib/firestore-cache';
import { isUiDesignMode } from '@/lib/design-mode';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ArticleListItem {
  articleId: string;
  slug: string;
  type: string;
  title: string;
  thumbnailUrl: string;
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export { getArticleTypeLabel } from '@/lib/contentLabels';

export async function getArticlesList(): Promise<ArticleListItem[]> {
  if (isUiDesignMode()) return [];
  if (!supabaseAdmin) return [];
  return getOrSet('articles', 'list', TTL.ARTICLES, async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('articles')
        .select('article_id, slug, type, title, thumbnail_url')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((row) => ({
        articleId: row.article_id,
        slug: row.slug ?? '',
        type: row.type ?? '',
        title: row.title ?? '',
        thumbnailUrl: row.thumbnail_url ?? '',
      }));
    } catch {
      return [];
    }
  });
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  if (isUiDesignMode()) return null;
  if (!supabaseAdmin) return null;
  return getOrSet('article', `slug:${slug}`, TTL.ARTICLE, async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('articles')
        .select('article_id, slug, type, title, thumbnail_url, content, created_at, updated_at')
        .eq('is_published', true)
        .eq('slug', slug)
        .maybeSingle();

      if (error || !data) return null;

      return {
        articleId: data.article_id,
        slug: data.slug ?? '',
        type: data.type ?? '',
        title: data.title ?? '',
        thumbnailUrl: data.thumbnail_url ?? '',
        content: data.content ?? '',
        createdAt: data.created_at ?? undefined,
        updatedAt: data.updated_at ?? undefined,
      };
    } catch {
      return null;
    }
  });
}
