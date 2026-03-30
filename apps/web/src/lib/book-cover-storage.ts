import path from 'path';
import fs from 'fs/promises';
import { supabaseAdmin } from '@/lib/supabase/admin';

const MAX_COVER_BYTES = 10 * 1024 * 1024;
const LOW_QUALITY_MIN_WIDTH = 320;
const LOW_QUALITY_MIN_HEIGHT = 480;

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

function buildCoverCandidates(rawSourceUrl: string): string[] {
  const normalized = normalizeExternalCoverUrl(rawSourceUrl);
  if (!normalized) return [];

  const candidates = new Set<string>([normalized]);
  candidates.add(normalized.replace('/coversum/', '/cover500/'));
  candidates.add(normalized.replace('/cover150/', '/cover200/'));
  candidates.add(normalized.replace('/cover150/', '/cover500/'));
  candidates.add(normalized.replace('/cover200/', '/cover500/'));
  candidates.add(normalized.replace('/cover500/', '/cover/'));
  candidates.add(normalized.replace('/cover500/', '/cover200/'));
  candidates.add(normalized.replace('/cover500/', '/cover150/'));
  candidates.add(normalized.replace('/cover/', '/cover500/'));

  return Array.from(candidates).filter((url) => url.startsWith('http'));
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

function readPngSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readGifSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 10) return null;
  const header = buffer.toString('ascii', 0, 6);
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;
  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
}

function readJpegSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    const isSof =
      marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
      marker === 0xc5 || marker === 0xc6 || marker === 0xc7 || marker === 0xc9 ||
      marker === 0xca || marker === 0xcb || marker === 0xcd || marker === 0xce ||
      marker === 0xcf;

    if (isSof) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function readWebpSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;

  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  return null;
}

export function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  return (
    readPngSize(buffer) ??
    readJpegSize(buffer) ??
    readGifSize(buffer) ??
    readWebpSize(buffer)
  );
}

export function isLowQualityCoverByDimensions(size: { width: number; height: number } | null): boolean {
  if (!size) return false;
  return size.width < LOW_QUALITY_MIN_WIDTH || size.height < LOW_QUALITY_MIN_HEIGHT;
}

type CoverFetchCandidate = {
  sourceUrl: string;
  buffer: Buffer;
  contentType: string;
  dimensions: { width: number; height: number } | null;
};

async function fetchCoverCandidate(sourceUrl: string): Promise<CoverFetchCandidate | null> {
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const contentTypeHeader = res.headers.get('content-type');
    if (contentTypeHeader && !contentTypeHeader.toLowerCase().startsWith('image/')) {
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length || buffer.length > MAX_COVER_BYTES) {
      return null;
    }

    return {
      sourceUrl,
      buffer,
      contentType: contentTypeHeader?.split(';')[0]?.trim() || 'image/jpeg',
      dimensions: getImageDimensions(buffer),
    };
  } catch {
    return null;
  }
}

async function fetchBestCoverCandidate(rawSourceUrl: string): Promise<CoverFetchCandidate | null> {
  const candidates = buildCoverCandidates(rawSourceUrl);
  if (candidates.length === 0) return null;

  const fetched = (await Promise.all(candidates.map(fetchCoverCandidate))).filter(
    (candidate): candidate is CoverFetchCandidate => Boolean(candidate),
  );

  if (fetched.length === 0) return null;

  fetched.sort((a, b) => {
    const areaA = (a.dimensions?.width ?? 0) * (a.dimensions?.height ?? 0);
    const areaB = (b.dimensions?.width ?? 0) * (b.dimensions?.height ?? 0);
    return areaB - areaA;
  });

  return fetched[0] ?? null;
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
    const bestCandidate = await fetchBestCoverCandidate(sourceUrl);
    if (!bestCandidate) return sourceUrl;

    const ext = inferExtension(bestCandidate.contentType, bestCandidate.sourceUrl);
    const filePath = `books/covers/${isbn}.${ext}`;

    if (isSupabaseStorageConfigured()) {
      const uploaded = await uploadBufferToSupabase(bestCandidate.buffer, filePath, bestCandidate.contentType);
      if (uploaded) return uploaded;
    }

    const localUrl = await saveLocally(bestCandidate.buffer, filePath);
    return localUrl || bestCandidate.sourceUrl;
  } catch (error) {
    console.warn('[book-cover-storage] External cover fetch failed:', error);
    return sourceUrl;
  }
}
