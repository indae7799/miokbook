/**
 * 관리자 마스터 계정 1회 생성
 * - 이메일: admin@admin.local (Firebase Auth는 이메일 로그인만 지원)
 * - 비밀번호: admin
 * - Custom Claims: role = 'admin'
 *
 * 실행: apps/web 폴더에서 pnpm run create-admin
 * 또는 루트에서: pnpm --dir apps/web run create-admin
 *
 * .env.local 에 FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY 필요
 */

const path = require('path');
const fs = require('fs');

const appDir = path.join(__dirname, '..');
const envPath = path.join(appDir, '.env.local');
const rootDir = path.resolve(appDir, '..');
const jsonPathLocal = path.join(appDir, 'service-account.json');
const jsonPathRoot = path.join(rootDir, 'miokbook-4c24a-firebase-adminsdk-fbsvc-fc495a5693.json');
const jsonPath = fs.existsSync(jsonPathLocal) ? jsonPathLocal : jsonPathRoot;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  let key = null;
  let val = '';
  for (const line of lines) {
    if (key && (line.startsWith(' ') || line.startsWith('"') || !line.match(/^[A-Za-z_][A-Za-z0-9_]*=/))) {
      val += (val ? '\n' : '') + line.trim();
      continue;
    }
    if (key) {
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      process.env[key] = val.replace(/\\n/g, '\n');
    }
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      key = m[1].trim();
      val = m[2].trim();
    } else {
      key = null;
    }
  }
  if (key) {
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val.replace(/\\n/g, '\n');
  }
}

let serviceAccount = null;
if (fs.existsSync(jsonPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(path.resolve(jsonPath), 'utf8'));
}

const adminEmail = process.env.ADMIN_MASTER_EMAIL || 'admin@admin.local';
const adminPassword = process.env.ADMIN_MASTER_PASSWORD || 'admin1';

async function main() {
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');

  if (getApps().length === 0) {
    if (serviceAccount) {
      const absPath = path.resolve(jsonPath);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = absPath;
      initializeApp();
    } else {
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
      if (!projectId || !clientEmail || !privateKey) {
        console.error('Missing Firebase Admin credentials. Set .env.local or put service account JSON at project root (miokbook-4c24a-firebase-adminsdk-*.json).');
        process.exit(1);
      }
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
  }

  const auth = getAuth();

  let uid;
  try {
    const user = await auth.getUserByEmail(adminEmail);
    uid = user.uid;
    console.log('기존 관리자 계정 발견:', adminEmail, 'uid:', uid);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const userRecord = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: 'Admin',
        emailVerified: true,
      });
      uid = userRecord.uid;
      console.log('관리자 계정 생성됨:', adminEmail, 'uid:', uid);
    } else {
      throw e;
    }
  }

  await auth.setCustomUserClaims(uid, { role: 'admin' });
  console.log('Custom Claims 설정 완료: role = admin');

  console.log('\n--- 로그인 정보 ---');
  console.log('이메일:', adminEmail);
  console.log('비밀번호:', adminPassword);
  console.log('로그인 후 http://localhost:3000/admin 접속');
  console.log('(Custom Claims 반영을 위해 한 번 로그아웃 후 다시 로그인할 수 있음)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
