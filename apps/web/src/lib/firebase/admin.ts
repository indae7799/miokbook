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

/** Vercel 다줄 입력·따옴표·이스케이프 혼합 시 PEM 파싱 실패 방지 */
function normalizeAdminPrivateKey(raw: string): string {
  let k = raw.trim().replace(/^["']|["']$/g, '');
  k = k.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  k = k.replace(/\\n/g, '\n');
  if (k.includes('BEGIN') && !k.includes('\n')) {
    k = k.replace(/-----BEGIN/g, '\n-----BEGIN').replace(/-----END/g, '-----\n');
  }
  return k.trim();
}

/** 서버 전용 버킷명 우선(클라이언트와 분리), 없으면 NEXT_PUBLIC / 프로젝트 ID 추정 */
function resolveStorageBucket(): string | undefined {
  const serverBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  if (serverBucket) return serverBucket;
  const raw = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (raw) return raw;
  const pid =
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (pid) return `${pid}.firebasestorage.app`;
  return undefined;
}

function storageBucketNameCandidates(): string[] {
  const raw =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
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
          storageBucket: storageBucket ?? `${sa.project_id}.appspot.com`,
        });
      } else {
        const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
        if (jsonEnv) {
          try {
            const sa = JSON.parse(jsonEnv) as {
              project_id: string;
              client_email: string;
              private_key: string;
            };
            app = initializeApp({
              credential: cert({
                projectId: sa.project_id,
                clientEmail: sa.client_email,
                privateKey: sa.private_key.replace(/\\n/g, '\n'),
              }),
              storageBucket: storageBucket ?? `${sa.project_id}.appspot.com`,
            });
          } catch (parseErr) {
            console.error('[firebase/admin] FIREBASE_SERVICE_ACCOUNT_JSON parse failed:', parseErr);
          }
        }
        if (!app) {
          const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '';
          const privateKey = normalizeAdminPrivateKey(rawKey);
          const adminPid = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
          const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
          const serviceAccount = {
            projectId: adminPid,
            clientEmail,
            privateKey,
          };
          if (privateKey && clientEmail && adminPid) {
            try {
              const bucketOpt =
                storageBucket ?? (adminPid ? `${adminPid}.firebasestorage.app` : undefined);
              app = initializeApp({
                credential: cert(serviceAccount as ServiceAccount),
                ...(bucketOpt ? { storageBucket: bucketOpt } : {}),
              });
            } catch (credErr) {
              console.error('[firebase/admin] cert() failed (check PRIVATE_KEY newlines / PEM):', credErr);
            }
          } else if (!privateKey || !clientEmail || !adminPid) {
            console.error(
              '[firebase/admin] missing FIREBASE_ADMIN_* — need projectId, clientEmail, and non-empty privateKey',
            );
          }
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

/**
 * exists() 조회는 Storage 버킷 메타 IAM 이 없으면 실패·지연될 수 있어 쓰지 않는다.
 * initializeApp 의 기본 버킷 → 이름 후보 순으로 참조만 한다.
 */
async function getValidBucket() {
  if (!adminStorage) return null;
  try {
    const def = adminStorage.bucket();
    if (def?.name) return def;
  } catch {
    /* noop */
  }
  const candidates = storageBucketNameCandidates();
  for (const name of candidates) {
    try {
      return adminStorage.bucket(name);
    } catch {
      /* noop */
    }
  }
  return null;
}

/** 성공한 버킷만 캐시. null 은 캐시하지 않아 Vercel 콜드스타트·일시 오류 후 재시도 가능 */
let cachedAdminBucket: Awaited<ReturnType<typeof getValidBucket>> | undefined;
async function getAdminBucket() {
  if (cachedAdminBucket) return cachedAdminBucket;
  const b = await getValidBucket();
  if (b) cachedAdminBucket = b;
  return b;
}

export { adminAuth, adminDb, adminStorage, getAdminBucket };
