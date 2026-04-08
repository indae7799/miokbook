import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_FOLDERS = new Set(['banners', 'popup', 'popups', 'content', 'contents', 'events', 'store-hero', 'concerts', 'cms']);

function getExtension(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

function resolveImageContentType(file: File): string | null {
  const name = (file.name || '').toLowerCase();
  const fromName =
    /\.(jpe?g)$/.test(name) ? 'image/jpeg' : name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : null;
  if (ALLOWED_TYPES.includes(file.type)) return file.type;
  if (fromName) return fromName;
  return null;
}

function isSupabaseStorageConfigured(): boolean {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return !!(bucket && url && key && key !== 'missing-service-role-key');
}

function getSupabaseStorageDebugInfo() {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || '';
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  let host = '';
  if (url) {
    try {
      host = new URL(url).host;
    } catch {
      host = 'invalid-url';
    }
  }

  return {
    bucket,
    host,
    hasBucket: Boolean(bucket),
    hasUrl: Boolean(url),
    hasServiceRoleKey: Boolean(key && key !== 'missing-service-role-key'),
  };
}

async function uploadToSupabase(
  buffer: Buffer,
  uniquePath: string,
  contentType: string,
): Promise<{ url: string } | { error: string }> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!bucket) return { error: 'SUPABASE_STORAGE_BUCKET 미설정' };

  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(uniquePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.warn('[admin/upload] Supabase Storage failed:', {
      message: error.message,
      bucket,
      path: uniquePath,
      contentType,
    });
    return { error: error.message };
  }

  const pathInBucket = data?.path ?? uniquePath;
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(pathInBucket);
  return { url: pub.publicUrl };
}

async function saveLocally(buffer: Buffer, uniquePath: string): Promise<string> {
  const publicDir = path.resolve(process.cwd(), 'public', 'uploads');
  await fs.mkdir(publicDir, { recursive: true });
  const filePath = path.join(publicDir, uniquePath.replace(/\//g, '_'));
  await fs.writeFile(filePath, buffer);
  return `/uploads/${uniquePath.replace(/\//g, '_')}`;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const storagePath = formData.get('storagePath') as string | null;

    if (!file || !storagePath) {
      return NextResponse.json({ error: 'file and storagePath required' }, { status: 400 });
    }

    const contentType = resolveImageContentType(file);
    if (!contentType) {
      return NextResponse.json(
        {
          error: 'JPEG, PNG, WEBP만 업로드 가능합니다.',
          detail:
            file.type
              ? `파일 MIME은 "${file.type}" 입니다. 확장자가 jpg/png/webp 인지 확인해 주세요.`
              : '파일 형식을 인식하지 못했습니다. 파일명이 .jpg / .png / .webp 로 끝나는지 확인해 주세요.',
        },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 });
    }

    const folder = storagePath.split('/')[0]?.trim().toLowerCase();
    if (!folder || !ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: '허용되지 않은 업로드 경로입니다.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniquePath = `${folder}/${randomUUID()}.${getExtension(contentType)}`;
    let publicUrl: string | null = null;
    const errors: string[] = [];
    const storageDebug = getSupabaseStorageDebugInfo();

    if (isSupabaseStorageConfigured()) {
      const sup = await uploadToSupabase(buffer, uniquePath, contentType);
      if ('url' in sup) publicUrl = sup.url;
      else errors.push(sup.error);
    } else {
      console.warn('[admin/upload] Supabase storage not configured at runtime:', storageDebug);
    }

    if (!publicUrl) {
      try {
        publicUrl = await saveLocally(buffer, uniquePath);
      } catch (localErr) {
        console.error('[admin/upload] local disk fallback failed:', {
          error: localErr instanceof Error ? localErr.message : String(localErr),
          storageDebug,
          uploadErrors: errors,
          path: uniquePath,
        });
        return NextResponse.json(
          {
            error: 'STORAGE_UNAVAILABLE',
            detail: errors.filter(Boolean).join(' | ') || '업로드 저장소를 사용할 수 없습니다.',
            hint: 'Supabase Storage 버킷과 서버 환경변수를 확인하세요.',
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UPLOAD_FAILED';
    console.error('[admin/upload POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
