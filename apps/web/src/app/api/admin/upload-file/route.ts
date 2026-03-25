import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { adminAuth, getAdminBucket } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  // 이미지도 허용
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function getExtensionFromName(name: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    pdf: 'pdf', doc: 'doc', docx: 'docx',
    xls: 'xls', xlsx: 'xlsx', ppt: 'ppt', pptx: 'pptx',
    txt: 'txt', zip: 'zip', jpg: 'jpg', jpeg: 'jpg',
    png: 'png', webp: 'webp',
  };
  return ext ? (extMap[ext] ?? null) : null;
}

function resolveExt(file: File): string | null {
  if (ALLOWED_MIME_TYPES[file.type]) return ALLOWED_MIME_TYPES[file.type];
  return getExtensionFromName(file.name);
}

function isSupabaseConfigured(): boolean {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return !!(bucket && url && key && key !== 'missing-service-role-key');
}

async function uploadToSupabase(buffer: Buffer, filePath: string, contentType: string): Promise<string | null> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!bucket) return null;
  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(filePath, buffer, {
    contentType, upsert: true,
  });
  if (error) { console.warn('[upload-file] Supabase error:', error.message); return null; }
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(data?.path ?? filePath);
  return pub.publicUrl;
}

async function uploadToFirebase(buffer: Buffer, filePath: string, contentType: string): Promise<string | null> {
  try {
    const bucket = await getAdminBucket();
    if (!bucket) return null;
    const fileRef = bucket.file(filePath);
    const token = randomUUID();
    await fileRef.save(buffer, {
      metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } },
      resumable: false,
    });
    const encoded = encodeURIComponent(filePath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
  } catch (e) {
    console.warn('[upload-file] Firebase error:', e instanceof Error ? e.message : e);
    return null;
  }
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
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

    const ext = resolveExt(file);
    if (!ext) {
      return NextResponse.json({ error: `지원하지 않는 파일 형식입니다. (${file.type || file.name})` }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 20MB 이하여야 합니다.' }, { status: 400 });
    }

    const contentType = ALLOWED_MIME_TYPES[file.type] ? file.type : 'application/octet-stream';
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `attachments/${randomUUID()}.${ext}`;

    let url: string | null = null;

    if (isSupabaseConfigured()) {
      url = await uploadToSupabase(buffer, filePath, contentType);
    } else {
      url = await uploadToFirebase(buffer, filePath, contentType);
    }

    if (!url) {
      // 로컬 폴백
      try {
        const publicDir = path.resolve(process.cwd(), 'public', 'uploads');
        await fs.mkdir(publicDir, { recursive: true });
        const localName = filePath.replace(/\//g, '_');
        await fs.writeFile(path.join(publicDir, localName), buffer);
        url = `/uploads/${localName}`;
      } catch {
        return NextResponse.json({ error: '파일 업로드에 실패했습니다. 스토리지 설정을 확인해 주세요.' }, { status: 503 });
      }
    }

    return NextResponse.json({ url, originalName: file.name });
  } catch (e) {
    console.error('[upload-file POST]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'UPLOAD_FAILED' }, { status: 500 });
  }
}
