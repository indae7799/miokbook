import path from 'path';
import fs from 'fs/promises';
import { supabaseAdmin } from '@/lib/supabase/admin';

const MAX_COVER_BYTES = 10 * 1024 * 1024;

function isSupabaseStorageConfigured(): boolean {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return !!(bucket && url && key && key !== 'missing-service-role-key');
}

export function normalizeExternalCoverUrl(raw: string): string {
  const rawValue = raw.trim();
  if (!rawValue) return '';

  const value = rawValue.startsWith('//') ? `https:${rawValue}` : rawValue;
  if (!value.startsWith('http')) return '';

  return value
    .replace('/coversum/', '/cover500/')
    .replace('/cover200/', '/cover500/')
    .replace('/cover150/', '/cover500/')
    .replace('/cover/', '/cover500/');
}

function inferExtension(contentType: string | null, sourceUrl: string): string {
  const type = (contentType ?? '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';

  const lowerUrl = sourceUrl.toLowerCase();
  if (lowerUrl.includes('.png')) return 'png';
  if (lowerUrl.includes('.webp')) return 'webp';
  if (lowerUrl.includes('.gif')) return 'gif';
  return 'jpg';
}

async function uploadBufferToSupabase(buffer: Buffer, filePath: string, contentType: string): Promise<string | null> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!bucket) return null;

  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(filePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.warn('[book-cover-storage] Supabase upload failed:', error.message);
    return null;
  }

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(data?.path ?? filePath);
  return pub.publicUrl;
}

async function saveLocally(buffer: Buffer, filePath: string): Promise<string | null> {
  try {
    const publicDir = path.resolve(process.cwd(), 'public', 'uploads');
    await fs.mkdir(publicDir, { recursive: true });
    const localName = filePath.replace(/\//g, '_');
    await fs.writeFile(path.join(publicDir, localName), buffer);
    return `/uploads/${localName}`;
  } catch (error) {
    console.warn('[book-cover-storage] Local save failed:', error);
    return null;
  }
}

export async function persistExternalCoverImage(isbn: string, rawSourceUrl: string): Promise<string> {
  const sourceUrl = normalizeExternalCoverUrl(rawSourceUrl);
  if (!sourceUrl) return '';

  // Already stored locally or on our storage path.
  if (sourceUrl.startsWith('/uploads/')) return sourceUrl;

  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return sourceUrl;

    const contentTypeHeader = res.headers.get('content-type');
    if (contentTypeHeader && !contentTypeHeader.toLowerCase().startsWith('image/')) {
      return sourceUrl;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length || buffer.length > MAX_COVER_BYTES) {
      return sourceUrl;
    }

    const contentType = contentTypeHeader?.split(';')[0]?.trim() || 'image/jpeg';
    const ext = inferExtension(contentType, sourceUrl);
    const filePath = `books/covers/${isbn}.${ext}`;

    if (isSupabaseStorageConfigured()) {
      const uploaded = await uploadBufferToSupabase(buffer, filePath, contentType);
      if (uploaded) return uploaded;
    }

    const localUrl = await saveLocally(buffer, filePath);
    return localUrl || sourceUrl;
  } catch (error) {
    console.warn('[book-cover-storage] External cover fetch failed:', error);
    return sourceUrl;
  }
}
