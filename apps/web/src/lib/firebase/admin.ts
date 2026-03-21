// Server-side only. Do not import in client components.
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';

let adminAuth: ReturnType<typeof getAuth> | null = null;
let adminDb: ReturnType<typeof getFirestore> | null = null;
let adminStorage: ReturnType<typeof getStorage> | null = null;

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'miokbook-4c24a';

/** 클라이언트 env 또는 프로젝트 ID로 기본 버킷명 복구 (Vercel에서 빈 값 방지) */
function resolveStorageBucket(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (raw) return raw;
  const pid =
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (pid) return `${pid}.firebasestorage.app`;
  return undefined;
}

function storageBucketNameCandidates(): string[] {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const pid =
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const names: string[] = [];
  if (raw) {
    names.push(raw);
    if (raw.endsWith('.firebasestorage.app')) {
      names.push(raw.replace(/\.firebasestorage\.app$/i, '.appspot.com'));
    } else if (raw.endsWith('.appspot.com')) {
      names.push(raw.replace(/\.appspot\.com$/i, '.firebasestorage.app'));
    }
  }
  if (pid) {
    names.push(`${pid}.firebasestorage.app`, `${pid}.appspot.com`);
  }
  return [...new Set(names.filter(Boolean))];
}

try {
  const storageBucket = resolveStorageBucket();

  let app: ReturnType<typeof initializeApp> | undefined;
  if (getApps().length === 0) {

    if (USE_EMULATOR) {
      // 에뮬레이터 모드: 실제 인증서 불필요
      app = initializeApp({ projectId: PROJECT_ID });
      console.log('[firebase/admin] 🔧 EMULATOR MODE — 로컬 에뮬레이터에 연결됩니다.');
    } else {
      const saPath = path.resolve(process.cwd(), 'service-account.json');
      if (fs.existsSync(saPath)) {
        const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        app = initializeApp({
          credential: cert({
            projectId: sa.project_id,
            clientEmail: sa.client_email,
            privateKey: sa.private_key,
          }),
          storageBucket,
        });
      } else {
        const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, '') ?? '';
        const serviceAccount = {
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: rawKey.replace(/\\n/g, '\n'),
        };
        if (serviceAccount.privateKey && serviceAccount.clientEmail) {
          app = initializeApp({
            credential: cert(serviceAccount as ServiceAccount),
            storageBucket,
          });
        }
      }
    }

  } else {
    app = getApps()[0] as ReturnType<typeof initializeApp>;
  }

  if (app) {
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
    adminStorage = getStorage(app);

    if (USE_EMULATOR) {
      // Admin SDK는 환경변수로 에뮬레이터를 감지하므로 별도 호출 불필요
      // FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST 가 .env.emulator에 설정됨
    } else {
      console.log('[firebase/admin] initialized. storageBucket:', storageBucket);
    }
  }
} catch (e) {
  console.error('[firebase/admin] init error:', e);
}

async function getValidBucket() {
  if (!adminStorage) return null;
  // initializeApp({ storageBucket }) 와 동일한 기본 버킷을 최우선 (이름 불일치로 잘못된 bucket 참조 방지)
  try {
    return adminStorage.bucket();
  } catch {
    /* storageBucket 미설정 시 */
  }
  const candidates = storageBucketNameCandidates();
  for (const name of candidates) {
    try {
      return adminStorage.bucket(name);
    } catch {
      continue;
    }
  }
  return null;
}

let resolvedBucket: Awaited<ReturnType<typeof getValidBucket>> | undefined;
async function getAdminBucket() {
  if (resolvedBucket !== undefined) return resolvedBucket;
  resolvedBucket = await getValidBucket();
  return resolvedBucket;
}

export { adminAuth, adminDb, adminStorage, getAdminBucket };
