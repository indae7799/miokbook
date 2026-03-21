#!/usr/bin/env node
/**
 * CMS → 스토어 출력 검증 스크립트
 * - 서버가 localhost:3000에서 실행 중이어야 함
 * - 홈 페이지에서 CMS 데이터(MD의 선택, 하단 배너 등)가 노출되는지 확인
 *
 * 사용: node scripts/verify-cms-store.mjs
 */
const BASE = 'http://localhost:3000';

async function main() {
  console.log('=== CMS → 스토어 출력 검증 ===\n');

  // 1. 홈 페이지 fetch (SSR이므로 getHomePageData 결과가 HTML에 반영됨)
  const homeRes = await fetch(`${BASE}/`);
  if (!homeRes.ok) {
    console.error('❌ 홈 페이지 로드 실패:', homeRes.status, homeRes.statusText);
    process.exit(1);
  }
  const html = await homeRes.text();

  // 2. CMS 관련 마커 확인
  const checks = [
    { name: 'MD의 선택 섹션', pattern: /MD의 선택|md의 선택/i },
    { name: '메인 하단 배너 영역', pattern: /메인 하단 배너|mainBottom|배너 추가하기/ },
    { name: '오늘의 베스트셀러', pattern: /베스트셀러|bestseller/i },
    { name: '금주 출간', pattern: /금주 출간|새 책들/ },
  ];

  let passed = 0;
  for (const { name, pattern } of checks) {
    const ok = pattern.test(html);
    console.log(ok ? '✓' : '✗', name);
    if (ok) passed++;
  }

  // 3. API 상태 확인 (팝업은 인증 없이 호출 가능)
  const popupRes = await fetch(`${BASE}/api/store/popup`);
  const popupOk = popupRes.ok;
  console.log(popupOk ? '✓' : '✗', '스토어 팝업 API');

  console.log(`\n결과: ${passed}/${checks.length} 항목 확인, 팝업 API ${popupOk ? '정상' : '오류'}`);
  if (passed < checks.length || !popupOk) {
    process.exit(1);
  }
  console.log('\n✅ CMS 데이터가 스토어에 정상 출력됩니다.');
}

main().catch((e) => {
  console.error('검증 실패:', e.message);
  if (e.cause?.code === 'ECONNREFUSED') {
    console.error('서버가 실행 중인지 확인하세요: pnpm dev');
  }
  process.exit(1);
});
