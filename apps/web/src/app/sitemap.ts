import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrSet, TTL } from '@/lib/firestore-cache';
import { getSiteOrigin } from '@/lib/site-origin';

const BASE = getSiteOrigin();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/books`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/cart`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE}/mypage`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE}/events`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/curation`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/curation/md`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE}/bestsellers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${BASE}/new-books`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${BASE}/content`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  const [bookUrls, articleUrls] = await getOrSet(
    'sitemap',
    'urls',
    TTL.SITEMAP,
    async (): Promise<[MetadataRoute.Sitemap, MetadataRoute.Sitemap]> => {
      let books: MetadataRoute.Sitemap = [];
      let articles: MetadataRoute.Sitemap = [];
      if (!supabaseAdmin) return [books, articles];

      try {
        const { data } = await supabaseAdmin
          .from('books')
          .select('slug')
          .eq('is_active', true);

        books = (data ?? []).flatMap((row): MetadataRoute.Sitemap => {
          const slug = row.slug;
          if (typeof slug !== 'string' || !slug) return [];
          return [{ url: `${BASE}/books/${slug}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 }];
        });
      } catch (e) {
        console.warn('[sitemap] books fetch failed', e);
      }

      try {
        const { data } = await supabaseAdmin
          .from('articles')
          .select('slug')
          .eq('is_published', true);

        articles = (data ?? []).flatMap((row): MetadataRoute.Sitemap => {
          const slug = row.slug;
          if (typeof slug !== 'string' || !slug) return [];
          return [{ url: `${BASE}/content/${slug}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 }];
        });
      } catch (e) {
        console.warn('[sitemap] articles fetch failed', e);
      }

      return [books, articles];
    }
  );

  return [...staticPages, ...bookUrls, ...articleUrls];
}
