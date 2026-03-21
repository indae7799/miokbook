import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { adminAuth, adminStorage, getAdminBucket } from '@/lib/firebase/admin';

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

function summarizeStorageError(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as { code?: unknown; message?: unknown; errors?: unknown };
    const code = o.code != null ? String(o.code) : '';
    const msg = typeof o.message === 'string' ? o.message : e instanceof Error ? e.message : String(e);
    if (code && msg) return `${code}: ${msg}`;
    if (msg) return msg;
  }
  return e instanceof Error ? e.message : String(e);
}

async function uploadToStorage(
  buffer: Buffer,
  uniquePath: string,
  contentType: string,
): Promise<{ url: string | null; storageError?: string }> {
  try {
    const bucket = await getAdminBucket();
    if (!bucket) {
      const storageError = !adminStorage
        ? 'Admin SDK 미초기화 — Vercel에 FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY 확인'
        : '버킷 없음 — FIREBASE_STORAGE_BUCKET 또는 NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, Firebase Console Storage 활성화 확인';
      console.warn('[admin/upload]', storageError);
      return { url: null, storageError };
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
    return {
      url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`,
    };
  } catch (e) {
    const storageError = summarizeStorageError(e);
    console.warn('[admin/upload] Storage upload failed, falling back to local:', storageError);
    return { url: null, storageError };
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'JPEG, PNG, WEBP만 업로드 가능합니다.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 });
    }

    const folder = storagePath.split('/')[0]?.trim().toLowerCase();
    if (!folder || !ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: '허용되지 않은 업로드 경로입니다.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniquePath = `${folder}/${randomUUID()}.${getExtension(file.type)}`;

    const { url: publicUrl, storageError } = await uploadToStorage(buffer, uniquePath, file.type);
    let finalUrl = publicUrl;
    if (!finalUrl) {
      try {
        finalUrl = await saveLocally(buffer, uniquePath);
      } catch (localErr) {
        console.error('[admin/upload] local disk fallback failed (read-only on Vercel?):', localErr);
        return NextResponse.json(
          {
            error: 'STORAGE_UNAVAILABLE',
            detail:
              'Firebase Storage 업로드에 실패했고, 서버 디스크 저장도 불가합니다. Vercel에서는 FIREBASE_ADMIN_*·버킷명·GCP IAM(Storage Object Admin 등)을 확인하세요.',
            storageError: storageError ?? undefined,
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ url: finalUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'UPLOAD_FAILED';
    const detail = e instanceof Error ? e.stack : String(e);
    console.error('[admin/upload POST]', detail);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
