#!/usr/bin/env node
/**
 * Meilisearch 설정 검증 스크립트
 * 실행: node scripts/verify-meilisearch.mjs
 * (apps/web 디렉토리에서 실행)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const host = process.env.NEXT_PUBLIC_MEILISEARCH_HOST ?? '';
const masterKey = process.env.MEILISEARCH_MASTER_KEY ?? '';
const searchKey = process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY ?? '';

async function main() {
  console.log('=== Meilisearch 설정 검증 ===\n');

  console.log('1. 환경 변수');
  console.log('   NEXT_PUBLIC_MEILISEARCH_HOST:', host || '(없음)');
  console.log('   MEILISEARCH_MASTER_KEY:', masterKey ? '***설정됨***' : '(없음)');
  console.log('   NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY:', searchKey ? '***설정됨***' : '(없음)');

  if (!host || !masterKey) {
    console.log('\n❌ Meilisearch 사용 불가: HOST 또는 MASTER_KEY 미설정');
    console.log('   .env.local에 NEXT_PUBLIC_MEILISEARCH_HOST, MEILISEARCH_MASTER_KEY 설정 필요');
    process.exit(1);
  }

  console.log('\n2. Meilisearch 연결 테스트');
  const healthUrl = host.replace(/\/$/, '') + '/health';
  try {
    const healthRes = await fetch(healthUrl);
    const health = await healthRes.json().catch(() => ({}));
    if (healthRes.ok) {
      console.log('   ✅ 연결 성공:', health.status || 'ok');
    } else {
      console.log('   ❌ 연결 실패:', healthRes.status, health);
      process.exit(1);
    }
  } catch (err) {
    console.log('   ❌ 연결 실패:', err.message);
    console.log('   → Meilisearch가 실행 중인지 확인하세요.');
    console.log('   → localhost:7700 사용 시: docker run -d -p 7700:7700 getmeili/meilisearch');
    process.exit(1);
  }

  console.log('\n3. books 인덱스 확인');
  let numDocs = -1;
  const statsUrl = host.replace(/\/$/, '') + '/indexes/books/stats';
  try {
    const statsRes = await fetch(statsUrl, {
      headers: { Authorization: `Bearer ${masterKey}` },
    });
    const statsData = await statsRes.json().catch(() => ({}));

    if (statsRes.ok) {
      numDocs = statsData.numberOfDocuments ?? -1;
      console.log('   ✅ books 인덱스 존재, 문서 수:', numDocs);
      if (numDocs === 0) {
        console.log('   ⚠️ 인덱스가 비어 있음 → 관리자 페이지에서 "Meilisearch 동기화" 실행');
      }
    } else {
      const indexRes = await fetch(host.replace(/\/$/, '') + '/indexes/books', {
        headers: { Authorization: `Bearer ${masterKey}` },
      });
      if (indexRes.status === 404) {
        console.log('   ⚠️ books 인덱스 없음 → "Meilisearch 동기화" 실행 필요');
      } else {
        console.log('   ❌ 인덱스 조회 실패:', statsRes.status, statsData);
      }
    }
  } catch (err) {
    console.log('   ❌ 인덱스 조회 실패:', err.message);
  }

  console.log('\n4. Meilisearch 직접 검색 테스트');
  const searchUrl = host.replace(/\/$/, '') + '/indexes/books/search';
  try {
    const started = Date.now();
    const msRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${searchKey || masterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: '', limit: 12, filter: 'isActive = true' }),
    });
    const msElapsed = Date.now() - started;
    const msData = await msRes.json().catch(() => ({}));
    const hits = msData.hits ?? [];
    const total = msData.estimatedTotalHits ?? msData.totalHits ?? hits.length;

    if (msRes.ok) {
      console.log(`   ✅ Meilisearch 직접 검색: ${msElapsed}ms`);
      console.log('   - 결과:', total, '건, 반환:', hits.length, '건');
      if (msElapsed > 1000) console.log('   ⚠️ 1초 이상 소요됨');
    } else {
      console.log('   ❌ Meilisearch 검색 실패:', msRes.status, msData);
    }
  } catch (err) {
    console.log('   ❌ Meilisearch 직접 검색 실패:', err.message);
  }

  console.log('\n5. Next.js 검색 API 테스트 (GET /api/search)');
  try {
    const started = Date.now();
    const searchRes = await fetch(
      `http://localhost:3000/api/search?page=1&pageSize=12&sort=latest`
    );
    const elapsed = Date.now() - started;
    const searchData = await searchRes.json().catch(() => ({}));
    const count = searchData.totalCount ?? searchData.data?.totalHits ?? 0;
    const books = searchData.books ?? searchData.data?.hits ?? [];

    if (searchRes.ok) {
      console.log(`   ✅ 검색 성공 (${elapsed}ms)`);
      console.log('   - 총 결과:', count, '건');
      console.log('   - 반환 도서:', books.length, '건');
      if (elapsed > 3000) {
        console.log('   ⚠️ 응답이 3초 이상 소요됨 — Meilisearch 미사용 또는 네트워크 지연 가능');
      } else if (elapsed < 500) {
        console.log('   ✅ 응답 속도 정상');
      }
    } else {
      console.log('   ❌ 검색 실패:', searchRes.status, searchData);
    }
  } catch (err) {
    console.log('   ❌ 검색 실패:', err.message);
    console.log('   → Next.js 서버가 localhost:3000에서 실행 중인지 확인하세요.');
  }

  console.log('\n=== 검증 완료 ===');

  if (numDocs === 0) {
    console.log('\n📌 조치: books 인덱스가 비어 있습니다.');
    console.log('   1. 관리자 페이지 로그인 → 도서 관리');
    console.log('   2. "Meilisearch 동기화" 버튼 클릭');
    console.log('   3. 동기화 완료 후 검색이 즉시 동작합니다 (Meilisearch 직접 검색: 4ms)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
