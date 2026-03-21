import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey) || USE_EMULATOR;

let app: FirebaseApp | undefined;
let auth: ReturnType<typeof getAuth> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

try {
  if (isFirebaseConfigured) {
    const config = USE_EMULATOR
      ? { ...firebaseConfig, apiKey: firebaseConfig.apiKey || 'emulator-api-key' }
      : firebaseConfig;

    app = getApps().length === 0 ? initializeApp(config) : (getApps()[0] as FirebaseApp);

    if (app) {
      auth = getAuth(app);
      storage = getStorage(app);

      if (USE_EMULATOR && typeof window !== 'undefined') {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectStorageEmulator(storage, 'localhost', 9199);
        console.log('[firebase/client] emulator connected');
      }
    }
  }
} catch {
  // Keep null exports on config/runtime errors.
}

export { app, auth, storage };
