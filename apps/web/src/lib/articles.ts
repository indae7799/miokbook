import { getOrSet, TTL } from '@/lib/firestore-cache';
import { isUiDesignMode } from '@/lib/design-mode';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const NOTICE_ARTICLE_TYPE = 'notice';

export interface ArticleListItem {
  articleId: string;
  slug: string;
  type: string;
  title: string;
  thumbnailUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
}

export { getArticleTypeLabel } from '@/lib/contentLabels';

type ArticleRow = {
  article_id: string;
  slug?: string | null;
  type?: string | null;
  title?: string | null;
  thumbnail_url?: string | null;
  content?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function mapArticleRow(row: ArticleRow): ArticleDetail {
  return {
    articleId: row.article_id,
    slug: row.slug ?? '',
    type: row.type ?? '',
    title: row.title ?? '',
    thumbnailUrl: row.thumbnail_url ?? '',
    content: row.content ?? '',
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

async function getArticlesListByType(type: string): Promise<ArticleListItem[]> {
  if (isUiDesignMode()) return [];
  if (!supabaseAdmin) return [];

  return getOrSet('articles', `list:${type}`, TTL.ARTICLES, async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('articles')
        .select('article_id, slug, type, title, thumbnail_url, created_at, updated_at')
        .eq('is_published', true)
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => mapArticleRow(row));
    } catch {
      return [];
    }
  });
}

export async function getArticlesList(): Promise<ArticleListItem[]> {
  if (isUiDesignMode()) return [];
  if (!supabaseAdmin) return [];

  return getOrSet('articles', 'list:content', TTL.ARTICLES, async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('articles')
        .select('article_id, slug, type, title, thumbnail_url, created_at, updated_at')
        .eq('is_published', true)
        .neq('type', NOTICE_ARTICLE_TYPE)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => mapArticleRow(row));
    } catch {
      return [];
    }
  });
}

export async function getNoticesList(): Promise<ArticleListItem[]> {
  return getArticlesListByType(NOTICE_ARTICLE_TYPE);
}

async function getArticleBySlugWithType(slug: string, type?: string): Promise<ArticleDetail | null> {
  if (isUiDesignMode()) return null;
  if (!supabaseAdmin) return null;

  const cacheKey = type ? `slug:${slug}:type:${type}` : `slug:${slug}:content`;

  return getOrSet('article', cacheKey, TTL.ARTICLE, async () => {
    try {
      let query = supabaseAdmin
        .from('articles')
        .select('article_id, slug, type, title, thumbnail_url, content, created_at, updated_at')
        .eq('is_published', true)
        .eq('slug', slug);

      query = type ? query.eq('type', type) : query.neq('type', NOTICE_ARTICLE_TYPE);

      const { data, error } = await query.maybeSingle();
      if (error || !data) return null;

      return mapArticleRow(data);
    } catch {
      return null;
    }
  });
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  return getArticleBySlugWithType(slug);
}

export async function getNoticeBySlug(slug: string): Promise<ArticleDetail | null> {
  return getArticleBySlugWithType(slug, NOTICE_ARTICLE_TYPE);
}
