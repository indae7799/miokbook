// Server-side only. Do not import in client components.
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';

let adminAuth: ReturnType<typeof getAuth> | null = null;

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'miokbook-4c24a';

try {
  let app: ReturnType<typeof initializeApp> | undefined;

  if (getApps().length === 0) {
    if (USE_EMULATOR) {
      app = initializeApp({ projectId: PROJECT_ID });
      console.log('[firebase/admin] emulator mode enabled');
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
          });
        }
      }
    }
  } else {
    app = getApps()[0] as ReturnType<typeof initializeApp>;
  }

  if (app) {
    adminAuth = getAuth(app);
  }
} catch (error) {
  console.error('[firebase/admin] init error:', error);
}

export { adminAuth };
