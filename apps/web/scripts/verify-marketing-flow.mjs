import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!projectId || !clientEmail || !privateKey || !apiKey) {
  throw new Error('Missing Firebase env vars required for verification');
}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

async function getAdminIdToken() {
  const customToken = await getAuth(app).createCustomToken('cursor-admin-verifier', { role: 'admin' });
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    throw new Error(`Custom token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.idToken;
}

async function uploadImage(idToken, imagePath, storagePath) {
  const buffer = await fs.readFile(imagePath);
  const file = new File([buffer], path.basename(imagePath), { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('storagePath', storagePath);

  const res = await fetch('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Upload failed (${storagePath}): ${res.status} ${text}`);
  }
  return JSON.parse(text).url;
}

async function fetchAdminCms(idToken) {
  const res = await fetch('http://localhost:3000/api/admin/cms', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Admin CMS GET failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

async function patchAdminCms(idToken, payload) {
  const res = await fetch('http://localhost:3000/api/admin/cms', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Admin CMS PATCH failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

async function main() {
  const imagePath =
    process.argv[2] ??
    'C:\\Users\\jungindae\\.cursor\\projects\\c-Users-jungindae-Desktop\\assets\\c__Users_jungindae_AppData_Roaming_Cursor_User_workspaceStorage_ed713ff4e213a36c5d75f57d065e62f5_images_image-fc53f3e5-9084-4267-8d67-544fa44833d0.png';

  const idToken = await getAdminIdToken();
  const stamp = Date.now();

  console.log('1) Admin token issued');

  const bannerUrl = await uploadImage(idToken, imagePath, `banners/verify-${stamp}.png`);
  console.log('2) Banner upload URL:', bannerUrl);

  const popupUrl = await uploadImage(idToken, imagePath, `popups/verify-${stamp}.png`);
  console.log('3) Popup upload URL:', popupUrl);

  const current = await fetchAdminCms(idToken);
  const bannerId = `cursor_banner_${stamp}`;
  const popupId = `cursor_popup_${stamp}`;

  const heroBanners = [...(current.heroBanners ?? []), {
    id: bannerId,
    imageUrl: bannerUrl,
    linkUrl: '/books?keyword=다보기',
    position: 'main_hero',
    isActive: true,
    order: (current.heroBanners ?? []).length,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
  }];

  const popups = [
    ...((current.popups ?? []).filter((item) => item && typeof item === 'object')),
    {
      id: popupId,
      imageUrl: popupUrl,
      linkUrl: '/books?keyword=다보기',
      isActive: true,
      priority: 9999,
      endDate: null,
    },
  ];

  await patchAdminCms(idToken, { heroBanners, popups });
  console.log('4) CMS PATCH success');

  const updated = await fetchAdminCms(idToken);
  const savedBanner = (updated.heroBanners ?? []).find((b) => b.id === bannerId);
  const savedPopup = (updated.popups ?? []).find((p) => p.id === popupId);

  console.log('5) Saved banner found:', !!savedBanner, savedBanner?.imageUrl);
  console.log('6) Saved popup found:', !!savedPopup, savedPopup?.imageUrl);

  const popupRes = await fetch('http://localhost:3000/api/store/popup');
  const popupJson = await popupRes.json();
  console.log('7) Store popup API:', popupJson);

  const homeRes = await fetch('http://localhost:3000/');
  const homeHtml = await homeRes.text();
  const bannerVisibleInHome =
    homeHtml.includes(bannerUrl) ||
    homeHtml.includes(encodeURIComponent(bannerUrl)) ||
    homeHtml.includes(path.basename(bannerUrl));
  console.log('8) Home HTML contains banner URL:', bannerVisibleInHome);

  console.log(
    JSON.stringify(
      {
        bannerId,
        popupId,
        bannerUrl,
        popupUrl,
        savedBanner: !!savedBanner,
        savedPopup: !!savedPopup,
        popupApiMatches: popupJson?.id === popupId,
        homeContainsBanner: bannerVisibleInHome,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
