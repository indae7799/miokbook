import type { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase/admin';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/books`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/cart`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE}/mypage`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE}/events`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/curation`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/content`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  let bookUrls: MetadataRoute.Sitemap = [];
  let articleUrls: MetadataRoute.Sitemap = [];

  if (adminDb) {
    try {
      const booksSnap = await adminDb
        .collection('books')
        .where('isActive', '==', true)
        .get();
      bookUrls = booksSnap.docs.flatMap((doc): MetadataRoute.Sitemap => {
        const slug = doc.data()?.slug ?? doc.id;
        if (typeof slug !== 'string' || !slug) return [];
        return [{ url: `${BASE}/books/${slug}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 }];
      });
    } catch (e) {
      console.warn('[sitemap] books fetch failed', e);
    }

    try {
      const articlesSnap = await adminDb
        .collection('articles')
        .where('isPublished', '==', true)
        .get();
      articleUrls = articlesSnap.docs.flatMap((doc): MetadataRoute.Sitemap => {
        const slug = doc.data()?.slug;
        if (typeof slug !== 'string' || !slug) return [];
        return [{ url: `${BASE}/content/${slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 }];
      });
    } catch (e) {
      console.warn('[sitemap] articles fetch failed', e);
    }
  }

  return [...staticPages, ...bookUrls, ...articleUrls];
}
