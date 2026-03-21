import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.join(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const envPath = path.join(appDir, '.env.local');
const localServiceAccountPath = path.join(appDir, 'service-account.json');
const rootServiceAccountPath = path.join(repoRoot, 'miokbook-4c24a-firebase-adminsdk-fbsvc-fc495a5693.json');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let key = null;
  let val = '';

  for (const line of lines) {
    if (key && (line.startsWith(' ') || line.startsWith('"') || !line.match(/^[A-Za-z_][A-Za-z0-9_]*=/))) {
      val += (val ? '\n' : '') + line.trim();
      continue;
    }

    if (key) {
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val.replace(/\\n/g, '\n');
    }

    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) {
      key = null;
      continue;
    }

    key = match[1].trim();
    val = match[2].trim();
  }

  if (key) {
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val.replace(/\\n/g, '\n');
  }
}

function parseArgs(argv) {
  const args = { dryRun: false, collections: null };
  for (const raw of argv) {
    if (raw === '--dry-run') args.dryRun = true;
    if (raw.startsWith('--collections=')) {
      const value = raw.slice('--collections='.length).trim();
      args.collections = value ? value.split(',').map((part) => part.trim()).filter(Boolean) : [];
    }
  }
  return args;
}

function slugify(value, fallback = 'item') {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || fallback;
}

function toIso(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') {
    try {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : fallback;
    } catch {
      return fallback;
    }
  }
  if (typeof value === 'object' && value !== null) {
    if (typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000).toISOString();
    }
    if (typeof value._seconds === 'number') {
      return new Date(value._seconds * 1000).toISOString();
    }
  }
  return fallback;
}

function toPlain(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value?.toDate === 'function') return toIso(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if (typeof value.seconds === 'number' || typeof value._seconds === 'number') {
      return toIso(value);
    }
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const next = toPlain(child);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value.map((item) => toPlain(item)) : [];
}

function asObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return toPlain(value);
}

function asString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function asNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function getServiceAccountPath() {
  if (fs.existsSync(localServiceAccountPath)) return localServiceAccountPath;
  if (fs.existsSync(rootServiceAccountPath)) return rootServiceAccountPath;
  return null;
}

function initFirebase() {
  if (getApps().length > 0) return getFirestore();

  const serviceAccountPath = getServiceAccountPath();
  if (serviceAccountPath) {
    const absPath = path.resolve(serviceAccountPath);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = absPath;
    initializeApp();
    return getFirestore();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials are missing. Put service-account.json in apps/web or set FIREBASE_ADMIN_* in .env.local.');
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return getFirestore();
}

function initSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function mapCms(doc) {
  const data = toPlain(doc.data());
  return {
    key: doc.id,
    value: asObject(data),
    updated_at: toIso(data.updatedAt, toIso(doc.updateTime, new Date().toISOString())),
  };
}

function mapSettings(doc) {
  const data = toPlain(doc.data());
  return {
    key: doc.id,
    value: asObject(data),
    updated_at: toIso(data.updatedAt, toIso(doc.updateTime, new Date().toISOString())),
  };
}

function mapBook(doc) {
  const data = toPlain(doc.data());
  const isbn = asString(data.isbn || doc.id);
  return {
    isbn,
    slug: asString(data.slug || `${slugify(data.title, 'book')}-${isbn}`),
    title: asString(data.title),
    author: asString(data.author),
    publisher: asString(data.publisher),
    description: asString(data.description),
    cover_image: asString(data.coverImage ?? data.cover_image),
    list_price: asNumber(data.listPrice ?? data.list_price),
    sale_price: asNumber(data.salePrice ?? data.sale_price),
    category: asString(data.category),
    status: asString(data.status || 'on_sale'),
    is_active: asBoolean(data.isActive ?? data.is_active, true),
    publish_date: toIso(data.publishDate ?? data.publish_date),
    rating: asNumber(data.rating),
    rating_total: asNumber(data.ratingTotal ?? data.rating_total),
    review_count: asNumber(data.reviewCount ?? data.review_count),
    sales_count: asNumber(data.salesCount ?? data.sales_count),
    table_of_contents: asString(data.tableOfContents ?? data.table_of_contents),
    synced_at: toIso(data.syncedAt ?? data.synced_at),
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
    updated_at: toIso(data.updatedAt ?? data.updated_at, toIso(doc.updateTime, new Date().toISOString())),
  };
}

function mapInventory(doc) {
  const data = toPlain(doc.data());
  return {
    isbn: asString(data.isbn || doc.id),
    stock: asNumber(data.stock),
    reserved: asNumber(data.reserved),
    updated_at: toIso(data.updatedAt ?? data.updated_at, toIso(doc.updateTime, new Date().toISOString())),
  };
}

function mapOrder(doc) {
  const data = toPlain(doc.data());
  return {
    order_id: asString(data.orderId || doc.id),
    user_id: data.userId ?? data.user_id ?? null,
    guest_phone: data.guestPhone ?? data.guest_phone ?? null,
    status: asString(data.status || 'pending'),
    shipping_status: asString(data.shippingStatus ?? data.shipping_status ?? 'ready'),
    items: asArray(data.items),
    total_price: asNumber(data.totalPrice ?? data.total_price),
    shipping_fee: asNumber(data.shippingFee ?? data.shipping_fee),
    shipping_address: data.shippingAddress ?? data.shipping_address ?? null,
    payment_key: data.paymentKey ?? data.payment_key ?? null,
    return_status: data.returnStatus ?? data.return_status ?? null,
    return_reason: data.returnReason ?? data.return_reason ?? null,
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
    expires_at: toIso(data.expiresAt ?? data.expires_at),
    paid_at: toIso(data.paidAt ?? data.paid_at),
    cancelled_at: toIso(data.cancelledAt ?? data.cancelled_at),
    delivered_at: toIso(data.deliveredAt ?? data.delivered_at),
    updated_at: toIso(data.updatedAt ?? data.updated_at),
    return_completed_at: toIso(data.returnCompletedAt ?? data.return_completed_at),
    exchange_completed_at: toIso(data.exchangeCompletedAt ?? data.exchange_completed_at),
  };
}

function mapReview(doc) {
  const data = toPlain(doc.data());
  return {
    review_id: asString(data.reviewId || doc.id),
    book_isbn: asString(data.bookIsbn ?? data.book_isbn),
    user_id: asString(data.userId ?? data.user_id),
    user_name: asString(data.userName ?? data.user_name),
    rating: asNumber(data.rating),
    content: asString(data.content),
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
  };
}

function mapEvent(doc) {
  const data = toPlain(doc.data());
  return {
    event_id: asString(data.eventId || doc.id),
    title: asString(data.title),
    description: asString(data.description),
    image_url: asString(data.imageUrl ?? data.image_url),
    type: asString(data.type || 'book_concert'),
    date: toIso(data.date),
    location: asString(data.location),
    capacity: asNumber(data.capacity),
    registered_count: asNumber(data.registeredCount ?? data.registered_count),
    is_active: asBoolean(data.isActive ?? data.is_active, true),
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
    updated_at: toIso(data.updatedAt ?? data.updated_at, toIso(doc.updateTime, new Date().toISOString())),
  };
}

function mapEventRegistration(doc) {
  const data = toPlain(doc.data());
  return {
    registration_id: asString(data.registrationId || doc.id),
    event_id: asString(data.eventId ?? data.event_id),
    event_title: asString(data.eventTitle ?? data.event_title),
    user_id: asString(data.userId ?? data.user_id),
    user_name: asString(data.userName ?? data.user_name),
    user_email: asString(data.userEmail ?? data.user_email),
    phone: asString(data.phone),
    address: asString(data.address),
    privacy_accepted: asBoolean(data.privacyAccepted ?? data.privacy_accepted, false),
    retention_quarter: asString(data.retentionQuarter ?? data.retention_quarter),
    status: asString(data.status || 'registered'),
    cancel_reason: asString(data.cancelReason ?? data.cancel_reason),
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
    updated_at: toIso(data.updatedAt ?? data.updated_at, toIso(doc.updateTime)),
    cancelled_at: toIso(data.cancelledAt ?? data.cancelled_at),
  };
}

function mapArticle(doc) {
  const data = toPlain(doc.data());
  return {
    article_id: asString(data.articleId || doc.id),
    slug: asString(data.slug || `${slugify(data.title, 'article')}-${doc.id}`),
    type: asString(data.type || 'bookstore_story'),
    title: asString(data.title),
    content: asString(data.content),
    thumbnail_url: asString(data.thumbnailUrl ?? data.thumbnail_url),
    is_published: asBoolean(data.isPublished ?? data.is_published, false),
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
    updated_at: toIso(data.updatedAt ?? data.updated_at, toIso(doc.updateTime, new Date().toISOString())),
  };
}

function mapConcert(doc) {
  const data = toPlain(doc.data());
  return {
    id: asString(data.id || doc.id),
    title: asString(data.title),
    slug: asString(data.slug || `${slugify(data.title, 'concert')}-${doc.id}`),
    is_active: asBoolean(data.isActive ?? data.is_active, true),
    image_url: asString(data.imageUrl ?? data.image_url),
    table_rows: asArray(data.tableRows ?? data.table_rows),
    book_isbns: Array.isArray(data.bookIsbns ?? data.book_isbns) ? [...(data.bookIsbns ?? data.book_isbns)] : [],
    description: asString(data.description),
    google_maps_embed_url: asString(data.googleMapsEmbedUrl ?? data.google_maps_embed_url),
    date: toIso(data.date),
    order: asNumber(data.order),
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
    updated_at: toIso(data.updatedAt ?? data.updated_at, toIso(doc.updateTime, new Date().toISOString())),
  };
}

function mapYoutubeContent(doc) {
  const data = toPlain(doc.data());
  return {
    id: asString(data.id || doc.id),
    slug: asString(data.slug || `${slugify(data.title, 'video')}-${doc.id}`),
    title: asString(data.title),
    description: asString(data.description),
    youtube_id: asString(data.mainYoutubeId ?? data.youtubeId ?? data.youtube_id),
    thumbnail_url: asString(data.customThumbnailUrl ?? data.thumbnailUrl ?? data.thumbnail_url),
    is_published: asBoolean(data.isPublished ?? data.is_published, false),
    order: asNumber(data.order),
    related_youtube_ids: Array.isArray(data.relatedYoutubeIds ?? data.related_youtube_ids) ? [...(data.relatedYoutubeIds ?? data.related_youtube_ids)] : [],
    related_isbns: Array.isArray(data.relatedIsbns ?? data.related_isbns) ? [...(data.relatedIsbns ?? data.related_isbns)] : [],
    published_at: toIso(data.publishedAt ?? data.published_at),
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
  };
}

function mapBulkOrder(doc) {
  const data = toPlain(doc.data());
  return {
    id: asString(data.id || doc.id),
    organization: asString(data.organization),
    contact_name: asString(data.contactName ?? data.contact_name),
    phone: asString(data.phone),
    email: asString(data.email),
    delivery_date: asString(data.deliveryDate ?? data.delivery_date),
    status: asString(data.status || 'pending'),
    books: asArray(data.books),
    notes: asString(data.notes),
    quote: data.quote ? toPlain(data.quote) : null,
    contract: data.contract ? toPlain(data.contract) : null,
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
  };
}

function mapUserProfile(doc) {
  const data = toPlain(doc.data());
  return {
    uid: asString(data.uid || doc.id),
    display_name: data.displayName ?? data.display_name ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    role: asString(data.role || 'user'),
    created_at: toIso(data.createdAt ?? data.created_at, toIso(doc.createTime, new Date().toISOString())),
    updated_at: toIso(data.updatedAt ?? data.updated_at, toIso(doc.updateTime, new Date().toISOString())),
  };
}

const MIGRATIONS = [
  { source: 'cms', target: 'cms', onConflict: 'key', map: mapCms },
  { source: 'settings', target: 'settings', onConflict: 'key', map: mapSettings },
  { source: 'books', target: 'books', onConflict: 'isbn', map: mapBook },
  { source: 'inventory', target: 'inventory', onConflict: 'isbn', map: mapInventory },
  { source: 'events', target: 'events', onConflict: 'event_id', map: mapEvent },
  { source: 'eventRegistrations', target: 'event_registrations', onConflict: 'registration_id', map: mapEventRegistration },
  { source: 'articles', target: 'articles', onConflict: 'article_id', map: mapArticle },
  { source: 'concerts', target: 'concerts', onConflict: 'id', map: mapConcert },
  { source: 'youtubeContents', target: 'youtube_contents', onConflict: 'id', map: mapYoutubeContent },
  { source: 'bulkOrders', target: 'bulk_orders', onConflict: 'id', map: mapBulkOrder },
  { source: 'orders', target: 'orders', onConflict: 'order_id', map: mapOrder },
  { source: 'reviews', target: 'reviews', onConflict: 'review_id', map: mapReview },
  { source: 'users', target: 'user_profiles', onConflict: 'uid', map: mapUserProfile },
];

async function upsertRows(supabase, migration, rows, dryRun) {
  const summary = { attempted: rows.length, success: 0, failed: 0, errors: [] };
  if (rows.length === 0) return summary;

  if (dryRun) {
    summary.success = rows.length;
    return summary;
  }

  const batches = chunk(rows, 200);
  for (const batch of batches) {
    const { error } = await supabase
      .from(migration.target)
      .upsert(batch, { onConflict: migration.onConflict });

    if (!error) {
      summary.success += batch.length;
      continue;
    }

    for (const row of batch) {
      const { error: rowError } = await supabase
        .from(migration.target)
        .upsert(row, { onConflict: migration.onConflict });

      if (rowError) {
        summary.failed += 1;
        summary.errors.push({
          id: row[migration.onConflict] ?? null,
          message: rowError.message,
        });
      } else {
        summary.success += 1;
      }
    }
  }

  return summary;
}

async function run() {
  loadEnvFile(envPath);
  const args = parseArgs(process.argv.slice(2));
  const selected = args.collections ? new Set(args.collections) : null;

  const firestore = initFirebase();
  const supabase = initSupabase();

  const migrations = selected
    ? MIGRATIONS.filter((migration) => selected.has(migration.source) || selected.has(migration.target))
    : MIGRATIONS;

  if (migrations.length === 0) {
    throw new Error('No collections matched. Use --collections=cms,books,...');
  }

  console.log('[migrate] mode =', args.dryRun ? 'dry-run' : 'write');
  console.log('[migrate] collections =', migrations.map((item) => item.source).join(', '));

  const report = [];
  for (const migration of migrations) {
    console.log(`\n[migrate] ${migration.source} -> ${migration.target}`);
    const snapshot = await firestore.collection(migration.source).get();
    const rows = snapshot.docs.map((doc) => migration.map(doc));
    const summary = await upsertRows(supabase, migration, rows, args.dryRun);
    report.push({
      source: migration.source,
      target: migration.target,
      firestoreCount: snapshot.size,
      ...summary,
    });
    console.log(`[migrate] fetched=${snapshot.size} success=${summary.success} failed=${summary.failed}`);
    if (summary.errors.length > 0) {
      console.log('[migrate] sample errors =', summary.errors.slice(0, 5));
    }
  }

  console.log('\n[migrate] summary');
  for (const item of report) {
    console.log(
      `- ${item.source} -> ${item.target}: firestore=${item.firestoreCount}, success=${item.success}, failed=${item.failed}`
    );
  }

  const failed = report.reduce((sum, item) => sum + item.failed, 0);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[migrate] failed:', error);
  process.exit(1);
});
