import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrSet, TTL } from '@/lib/firestore-cache';
import { getSiteOrigin } from '@/lib/site-origin';

const BASE = getSiteOrigin();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/books`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/selected-books`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.88 },
    { url: `${BASE}/events`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/concerts`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.84 },
    { url: `${BASE}/curation`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/curation/md`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE}/bestsellers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${BASE}/new-books`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${BASE}/content`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/notices`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.75 },
  ];

  const [bookUrls, articleUrls, concertUrls, eventUrls, videoUrls] = await getOrSet(
    'sitemap',
    'urls',
    TTL.SITEMAP,
    async (): Promise<[MetadataRoute.Sitemap, MetadataRoute.Sitemap, MetadataRoute.Sitemap, MetadataRoute.Sitemap, MetadataRoute.Sitemap]> => {
      let books: MetadataRoute.Sitemap = [];
      let articles: MetadataRoute.Sitemap = [];
      let concerts: MetadataRoute.Sitemap = [];
      let events: MetadataRoute.Sitemap = [];
      let videos: MetadataRoute.Sitemap = [];
      if (!supabaseAdmin) return [books, articles, concerts, events, videos];

      try {
        const { data } = await supabaseAdmin
          .from('books')
          .select('slug, updated_at')
          .eq('is_active', true);

        books = (data ?? []).flatMap((row): MetadataRoute.Sitemap => {
          const slug = row.slug;
          if (typeof slug !== 'string' || !slug) return [];
          return [{
            url: `${BASE}/books/${slug}`,
            lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          }];
        });
      } catch (e) {
        console.warn('[sitemap] books fetch failed', e);
      }

      try {
        const { data } = await supabaseAdmin
          .from('articles')
          .select('slug, type, updated_at')
          .eq('is_published', true);

        articles = (data ?? []).flatMap((row): MetadataRoute.Sitemap => {
          const slug = row.slug;
          if (typeof slug !== 'string' || !slug) return [];
          const basePath = row.type === 'notice' ? '/notices' : '/content';
          return [{
            url: `${BASE}${basePath}/${slug}`,
            lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
          }];
        });
      } catch (e) {
        console.warn('[sitemap] articles fetch failed', e);
      }

      try {
        const { data } = await supabaseAdmin
          .from('concerts')
          .select('slug, updated_at')
          .eq('is_active', true);

        concerts = (data ?? []).flatMap((row): MetadataRoute.Sitemap => {
          const slug = row.slug;
          if (typeof slug !== 'string' || !slug) return [];
          return [{
            url: `${BASE}/concerts/${slug}`,
            lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.82,
          }];
        });
      } catch (e) {
        console.warn('[sitemap] concerts fetch failed', e);
      }

      try {
        const { data } = await supabaseAdmin
          .from('events')
          .select('event_id, updated_at, type')
          .eq('is_active', true)
          .neq('type', 'book_concert');

        events = (data ?? []).flatMap((row): MetadataRoute.Sitemap => {
          const eventId = row.event_id;
          if (typeof eventId !== 'string' || !eventId) return [];
          return [{
            url: `${BASE}/events/${eventId}`,
            lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.72,
          }];
        });
      } catch (e) {
        console.warn('[sitemap] events fetch failed', e);
      }

      try {
        const { data } = await supabaseAdmin
          .from('youtube_contents')
          .select('slug, created_at, published_at, is_published')
          .order('created_at', { ascending: false });

        videos = (data ?? []).flatMap((row): MetadataRoute.Sitemap => {
          const slug = row.slug;
          if (typeof slug !== 'string' || !slug || row.is_published !== true) return [];
          const lastModified = row.published_at ?? row.created_at;
          return [{
            url: `${BASE}/content/video/${slug}`,
            lastModified: lastModified ? new Date(lastModified) : new Date(),
            changeFrequency: 'monthly',
            priority: 0.68,
          }];
        });
      } catch (e) {
        console.warn('[sitemap] youtube contents fetch failed', e);
      }

      return [books, articles, concerts, events, videos];
    }
  );

  return [...staticPages, ...bookUrls, ...articleUrls, ...concertUrls, ...eventUrls, ...videoUrls];
}
