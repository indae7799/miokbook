#!/usr/bin/env node
/**
 * public/uploads/ → Supabase Storage 마이그레이션
 *
 * 실행 (apps/web 에서):
 *   node scripts/migrate-uploads-to-supabase.mjs
 *
 * 필수 환경변수 (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_STORAGE_BUCKET
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, '..');

dotenv.config({ path: path.join(WEB_DIR, '.env.local') });

// ─── 환경변수 확인 ────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

if (!SUPABASE_URL || !SUPABASE_KEY || !BUCKET) {
  console.error('❌ 필수 환경변수 누락:');
  console.error('  SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌ 없음');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? '✅' : '❌ 없음');
  console.error('  SUPABASE_STORAGE_BUCKET:', BUCKET ? '✅' : '❌ 없음');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const UPLOADS_DIR = path.join(WEB_DIR, 'public', 'uploads');

// ─── 헬퍼 ────────────────────────────────────────────────────────

/** banners_UUID.png → "banners" */
function folderFromFilename(filename) {
  return filename.split('_')[0] || 'uploads';
}

function contentTypeFromExt(ext) {
  switch (ext.toLowerCase()) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png':  return 'image/png';
    case 'webp': return 'image/webp';
    default:     return 'application/octet-stream';
  }
}

/** 단일 파일을 Supabase Storage 에 업로드하고 공개 URL 반환 */
async function uploadFile(filename) {
  const buffer = await fs.readFile(path.join(UPLOADS_DIR, filename));
  const ext = path.extname(filename).slice(1);
  const folder = folderFromFilename(filename);
  // saveLocally 는 "folder/UUID.ext" → "folder_UUID.ext" 로 저장했으므로 역변환
  const baseName = filename.slice(folder.length + 1);
  const storagePath = `${folder}/${baseName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: contentTypeFromExt(ext), upsert: true });

  if (error) return { filename, error: error.message };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data?.path ?? storagePath);
  return { filename, newUrl: pub.publicUrl, storagePath };
}

/** cms.home JSONB 전체를 문자열 치환으로 업데이트 */
async function replaceUrlsInCms(urlMap) {
  const { data, error } = await supabase
    .from('cms').select('value').eq('key', 'home').maybeSingle();

  if (error || !data) {
    console.warn('  ⚠️  cms 읽기 실패:', error?.message ?? 'no data');
    return 0;
  }

  let json = JSON.stringify(data.value);
  let count = 0;
  for (const [oldUrl, newUrl] of urlMap) {
    if (json.includes(oldUrl)) {
      json = json.split(oldUrl).join(newUrl);
      count++;
    }
  }
  if (count === 0) return 0;

  const { error: err } = await supabase.from('cms')
    .update({ value: JSON.parse(json), updated_at: new Date().toISOString() })
    .eq('key', 'home');

  if (err) { console.warn('  ⚠️  cms 업데이트 실패:', err.message); return 0; }
  return count;
}

/** 단순 테이블의 컬럼 URL 교체 */
async function replaceUrlsInTable(table, column, urlMap) {
  let total = 0;
  for (const [oldUrl, newUrl] of urlMap) {
    const { data, error } = await supabase
      .from(table).update({ [column]: newUrl }).eq(column, oldUrl).select('*');
    if (error) {
      console.warn(`  ⚠️  ${table}.${column} 오류 (${path.basename(oldUrl)}):`, error.message);
    } else {
      total += data?.length ?? 0;
    }
  }
  return total;
}

// ─── 메인 ────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  public/uploads → Supabase Storage 마이그레이션     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`  버킷: ${BUCKET}`);
  console.log(`  디렉토리: ${UPLOADS_DIR}\n`);

  // 1. 파일 목록
  let files;
  try {
    files = (await fs.readdir(UPLOADS_DIR)).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  } catch {
    console.error(`❌ 디렉토리를 읽을 수 없습니다: ${UPLOADS_DIR}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('ℹ️  업로드할 파일이 없습니다.');
    return;
  }
  console.log(`📂 파일 ${files.length}개 발견\n`);

  // 2. Supabase Storage 업로드
  const urlMap = new Map();
  let uploaded = 0, failed = 0;

  for (const filename of files) {
    process.stdout.write(`  [${String(uploaded + failed + 1).padStart(2)}/${files.length}] ${filename} ... `);
    const result = await uploadFile(filename);
    if (result.error) {
      console.log(`❌ ${result.error}`);
      failed++;
    } else {
      console.log(`✅ → ${result.storagePath}`);
      urlMap.set(`/uploads/${filename}`, result.newUrl);
      urlMap.set(`https://miokbook.com/uploads/${filename}`, result.newUrl);
      uploaded++;
    }
  }

  console.log(`\n📤 업로드: ${uploaded}개 성공 / ${failed}개 실패\n`);
  if (urlMap.size === 0) {
    console.log('⚠️  성공한 업로드가 없어 DB 업데이트를 건너뜁니다.');
    return;
  }

  // 3. DB URL 업데이트
  console.log('📝 DB URL 업데이트 중...\n');

  const cmsCount      = await replaceUrlsInCms(urlMap);
  const concertsCount = await replaceUrlsInTable('concerts', 'image_url', urlMap);
  const eventsCount   = await replaceUrlsInTable('events', 'image_url', urlMap);
  const articlesCount = await replaceUrlsInTable('articles', 'thumbnail_url', urlMap);
  const youtubeCount  = await replaceUrlsInTable('youtube_contents', 'thumbnail_url', urlMap);

  console.log(`  cms.home (JSONB):               ${cmsCount}개 URL 교체`);
  console.log(`  concerts.image_url:             ${concertsCount}개 행`);
  console.log(`  events.image_url:               ${eventsCount}개 행`);
  console.log(`  articles.thumbnail_url:         ${articlesCount}개 행`);
  console.log(`  youtube_contents.thumbnail_url: ${youtubeCount}개 행`);
  console.log(`\n  DB 총 업데이트: ${cmsCount + concertsCount + eventsCount + articlesCount + youtubeCount}건\n`);

  console.log('✅ 마이그레이션 완료!\n');
  console.log('━━━ 다음 단계 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. 프로덕션에서 이미지 정상 표시 확인');
  console.log('2. 확인 후 디렉토리 삭제:');
  console.log('     rm -rf apps/web/public/uploads');
  console.log('3. .gitignore 에 추가:');
  console.log('     echo "public/uploads/" >> apps/web/.gitignore');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(e => {
  console.error('\n❌ 오류:', e.message);
  process.exit(1);
});
