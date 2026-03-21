import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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

const db = getFirestore(app);

async function jsonFetch(url, options = {}) {
  const startedAt = Date.now();
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return {
    ok: res.ok,
    status: res.status,
    json,
    elapsedMs: Date.now() - startedAt,
  };
}

async function getAdminIdToken() {
  const customToken = await getAuth(app).createCustomToken('cursor-admin-verifier', { role: 'admin' });
  const res = await jsonFetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    throw new Error(`Custom token exchange failed: ${res.status} ${JSON.stringify(res.json)}`);
  }
  return res.json.idToken;
}

async function uploadImage(idToken, imagePath, storagePath) {
  const buffer = await fs.readFile(imagePath);
  const file = new File([buffer], path.basename(imagePath), { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('storagePath', storagePath);
  const res = await jsonFetch('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${storagePath}): ${res.status} ${JSON.stringify(res.json)}`);
  }
  return { url: res.json.url, elapsedMs: res.elapsedMs };
}

async function fetchAdminCms(idToken) {
  const res = await jsonFetch('http://localhost:3000/api/admin/cms', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`Admin CMS GET failed: ${res.status} ${JSON.stringify(res.json)}`);
  return res.json;
}

async function patchAdminCms(idToken, payload) {
  const res = await jsonFetch('http://localhost:3000/api/admin/cms', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Admin CMS PATCH failed: ${res.status} ${JSON.stringify(res.json)}`);
  return res.json;
}

function pickKeyword(title) {
  const tokens = String(title ?? '')
    .split(/[\s\-–—:,\[\]\(\)\/]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  return tokens[0] ?? String(title ?? '').trim();
}

function summarizeBookDoc(data) {
  if (!data) return null;
  const out = {};
  for (const key of [
    'isbn',
    'slug',
    'title',
    'author',
    'publisher',
    'description',
    'coverImage',
    'listPrice',
    'salePrice',
    'category',
    'status',
    'isActive',
    'rating',
    'reviewCount',
    'salesCount',
  ]) {
    out[key] = data[key];
  }
  return out;
}

async function main() {
  const imagePath =
    process.argv[2] ??
    'C:\\Users\\jungindae\\.cursor\\projects\\c-Users-jungindae-Desktop\\assets\\c__Users_jungindae_AppData_Roaming_Cursor_User_workspaceStorage_ed713ff4e213a36c5d75f57d065e62f5_images_image-fc53f3e5-9084-4267-8d67-544fa44833d0.png';
  const isbns = ['9788961474764', '9791165703950'];
  const idToken = await getAdminIdToken();
  const startedAt = Date.now();
  const stamp = Date.now();

  const uploadTargets = [
    { kind: 'main_hero', storagePath: `banners/verify-main-hero-${stamp}.png`, position: 'main_hero' },
    { kind: 'main_top', storagePath: `banners/verify-main-top-${stamp}.png`, position: 'main_top' },
    { kind: 'sidebar', storagePath: `banners/verify-sidebar-${stamp}.png`, position: 'sidebar' },
    { kind: 'popup', storagePath: `popups/verify-popup-${stamp}.png`, position: null },
  ];

  const currentCms = await fetchAdminCms(idToken);

  const uploads = [];
  for (const target of uploadTargets) {
    const uploaded = await uploadImage(idToken, imagePath, target.storagePath);
    uploads.push({ ...target, ...uploaded });
  }

  const bannerEntries = uploads
    .filter((item) => item.position)
    .map((item, index) => ({
      id: `cursor_verify_banner_${item.kind}_${stamp}`,
      imageUrl: item.url,
      linkUrl: '/books?keyword=다보기',
      position: item.position,
      isActive: true,
      order: (currentCms.heroBanners ?? []).length + index,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: null,
    }));

  const popupEntry = {
    id: `cursor_verify_popup_${stamp}`,
    imageUrl: uploads.find((item) => item.kind === 'popup').url,
    linkUrl: '/books?keyword=다보기',
    isActive: true,
    priority: 9999,
    endDate: null,
  };

  await patchAdminCms(idToken, {
    heroBanners: [...(currentCms.heroBanners ?? []), ...bannerEntries],
    popups: [...(currentCms.popups ?? []), popupEntry],
  });

  const updatedCms = await fetchAdminCms(idToken);
  const heroIds = new Set(updatedCms.heroBanners.map((item) => item.id));
  const popupIds = new Set(updatedCms.popups.map((item) => item.id));

  const popupApi = await jsonFetch('http://localhost:3000/api/store/popup');
  const homeHtml = await jsonFetch('http://localhost:3000/');
  const homeBody = typeof homeHtml.json === 'string' ? homeHtml.json : '';

  const marketingVerification = {
    createdMainHero: heroIds.has(bannerEntries[0].id),
    createdMainTop: heroIds.has(bannerEntries[1].id),
    createdSidebar: heroIds.has(bannerEntries[2].id),
    createdPopup: popupIds.has(popupEntry.id),
    popupApiMatchesLatest: popupApi.json?.id === popupEntry.id,
    homeContainsMainHero: homeBody.includes(bannerEntries[0].imageUrl),
    homeContainsMainTop: homeBody.includes(bannerEntries[1].imageUrl),
    homeContainsSidebar: homeBody.includes(bannerEntries[2].imageUrl),
    uploadTimingsMs: uploads.map(({ kind, elapsedMs }) => ({ kind, elapsedMs })),
  };

  const bulkCreate = await jsonFetch('http://localhost:3000/api/admin/books/bulk-create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        { isbn: isbns[0], stock: 7 },
        { isbn: isbns[1], stock: 4 },
      ],
    }),
  });

  const savedBooks = {};
  const inventoryBooks = {};
  for (const isbn of isbns) {
    const bookSnap = await db.collection('books').doc(isbn).get();
    const inventorySnap = await db.collection('inventory').doc(isbn).get();
    savedBooks[isbn] = summarizeBookDoc(bookSnap.data());
    inventoryBooks[isbn] = inventorySnap.data() ?? null;
  }

  const firstBook = savedBooks[isbns[0]];
  const keyword = pickKeyword(firstBook?.title);

  const autocomplete1 = await jsonFetch(
    `http://localhost:3000/api/search?autocomplete=true&keyword=${encodeURIComponent(keyword)}`,
  );
  const autocomplete2 = await jsonFetch(
    `http://localhost:3000/api/search?autocomplete=true&keyword=${encodeURIComponent(keyword)}`,
  );
  const search1 = await jsonFetch(
    `http://localhost:3000/api/search?keyword=${encodeURIComponent(keyword)}&page=1&pageSize=12&sort=latest`,
  );
  const searchPage = await jsonFetch(
    `http://localhost:3000/books?keyword=${encodeURIComponent(keyword)}`,
  );

  const acSuggestions = autocomplete1.json?.data?.suggestions ?? [];
  const fullBooks = search1.json?.books ?? [];
  const targetSuggestion = acSuggestions.find((item) => item.isbn === isbns[0] || item.isbn === isbns[1]) ?? null;
  const targetFullBook = fullBooks.find((item) => item.isbn === isbns[0] || item.isbn === isbns[1]) ?? null;
  const searchPageHtml = typeof searchPage.json === 'string' ? searchPage.json : '';

  const searchVerification = {
    keyword,
    autocompleteMsFirst: autocomplete1.elapsedMs,
    autocompleteMsSecond: autocomplete2.elapsedMs,
    fullSearchMs: search1.elapsedMs,
    searchPageMs: searchPage.elapsedMs,
    autocompleteContainsTarget: !!targetSuggestion,
    autocompleteCoverPresent: !!targetSuggestion?.coverImage,
    fullSearchContainsTarget: !!targetFullBook,
    fullSearchCoverPresent: !!targetFullBook?.coverImage,
    searchPageContainsTitle: searchPageHtml.includes(firstBook?.title ?? ''),
    searchPageContainsCover: firstBook?.coverImage ? searchPageHtml.includes(firstBook.coverImage) : false,
    suggestionSample: targetSuggestion,
    fullSearchSample: targetFullBook,
  };

  await patchAdminCms(idToken, {
    heroBanners: (updatedCms.heroBanners ?? []).filter((item) => !String(item.id).startsWith('cursor_verify_banner_')),
    popups: (updatedCms.popups ?? []).filter((item) => !String(item.id).startsWith('cursor_verify_popup_')),
  });

  console.log(
    JSON.stringify(
      {
        totalElapsedMs: Date.now() - startedAt,
        marketingVerification,
        bulkCreate: {
          ok: bulkCreate.ok,
          status: bulkCreate.status,
          elapsedMs: bulkCreate.elapsedMs,
          response: bulkCreate.json,
        },
        storedBooks: savedBooks,
        inventory: inventoryBooks,
        searchVerification,
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
