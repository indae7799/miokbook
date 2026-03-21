import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { adminAuth, getAdminBucket } from '@/lib/firebase/admin';
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

/** 브라우저/OS에 따라 file.type 이 비거나 octet-stream 인 경우가 있어 확장자로 보완 (팝업·배너 업로드 400 방지) */
function resolveImageContentType(file: File): string | null {
  const name = (file.name || '').toLowerCase();
  const fromName =
    /\.(jpe?g)$/.test(name) ? 'image/jpeg' : name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : null;
  if (ALLOWED_TYPES.includes(file.type)) return file.type;
  if (fromName) return fromName;
  return null;
}

function formatStorageError(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as {
      message?: string;
      errors?: Array<{ message?: string }>;
      response?: { data?: { error?: { message?: string } } };
    };
    const g = o.errors?.[0]?.message;
    if (g) return g;
    const apiMsg = o.response?.data?.error?.message;
    if (apiMsg) return apiMsg;
    if (o.message) return o.message;
  }
  return e instanceof Error ? e.message : String(e);
}

function isSupabaseStorageConfigured(): boolean {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return !!(bucket && url && key && key !== 'missing-service-role-key');
}

/** 프로덕션 업로드 기본 경로 (Firebase Storage와 무관) */
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
    console.warn('[admin/upload] Supabase Storage failed:', error.message);
    return { error: error.message };
  }
  const pathInBucket = data?.path ?? uniquePath;
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(pathInBucket);
  return { url: pub.publicUrl };
}

async function uploadToFirebaseStorage(
  buffer: Buffer,
  uniquePath: string,
  contentType: string,
): Promise<{ url: string } | { error: string }> {
  try {
    const bucket = await getAdminBucket();
    if (!bucket) {
      return {
        error:
          'Storage 버킷을 열 수 없습니다. Vercel에 NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET(또는 프로젝트 ID)와 FIREBASE_ADMIN_* 가 모두 있는지 확인하세요.',
      };
    }

    const fileRef = bucket.file(uniquePath);
    const token = randomUUID();
    await fileRef.save(buffer, {
      metadata: {
        contentType,
        metadata: { firebaseStorageDownloadTokens: token },
      },
      resumable: false,
    });

    const encodedPath = encodeURIComponent(uniquePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
    return { url };
  } catch (e) {
    const text = formatStorageError(e);
    console.warn('[admin/upload] Firebase Storage upload failed, falling back:', text);
    return { error: text };
  }
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
              ? `파일 MIME이 "${file.type}" 입니다. 확장자가 jpg/png/webp 인지 확인하거나, 다른 프로그램으로 다시 저장해 보세요.`
              : '파일 형식을 인식하지 못했습니다. 파일명이 .jpg / .png / .webp 로 끝나는지 확인하세요.',
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
    const supabaseOn = isSupabaseStorageConfigured();

    if (supabaseOn) {
      const sup = await uploadToSupabase(buffer, uniquePath, contentType);
      if ('url' in sup) publicUrl = sup.url;
      else errors.push(sup.error);
    } else {
      const fb = await uploadToFirebaseStorage(buffer, uniquePath, contentType);
      if ('url' in fb) publicUrl = fb.url;
      else errors.push(fb.error);
    }

    if (!publicUrl) {
      try {
        publicUrl = await saveLocally(buffer, uniquePath);
      } catch (localErr) {
        console.error('[admin/upload] local disk fallback failed (read-only on Vercel?):', localErr);
        const hint = supabaseOn
          ? 'Supabase Storage: 대시보드에서 버킷이 공개(public)인지, 이름이 Vercel의 SUPABASE_STORAGE_BUCKET 과 같은지 확인하세요. 정책·용량 오류는 위 detail 메시지를 참고하세요.'
          : '권장: Supabase에 공개 버킷을 만들고 Vercel에 SUPABASE_STORAGE_BUCKET 을 설정하세요. (레거시) Firebase Storage만 쓰는 경우 FIREBASE_ADMIN_* 및 GCP Storage 권한을 확인하세요.';
        return NextResponse.json(
          {
            error: 'STORAGE_UNAVAILABLE',
            detail: errors.filter(Boolean).join(' | ') || '업로드 저장소를 사용할 수 없습니다.',
            hint,
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'UPLOAD_FAILED';
    const detail = e instanceof Error ? e.stack : String(e);
    console.error('[admin/upload POST]', detail);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
