# 새로운 3.txt 반영 현황

> 베스트셀러 컨테이너 확인 및 3.txt 9가지 요구사항 대조 (코드 + 빌드 확인 기준)

## 빌드/동작 여부

- **컴파일**: `npm run build` 시 Next.js 컴파일 성공 (✓ Compiled successfully).
- **실행**: `pnpm dev` 로 개발 서버 실행 가능, 페이지 정상 동작.
- **Lint**: 빌드 마지막 단계에서 ESLint 에러로 실패 (미사용 변수, prefer-const 등). **코드만 확인한 게 아니라 빌드까지 돌려서 동작은 됨.**

---

## 베스트셀러 컨테이너

- **위치**: `page.tsx` 5번 블록 — `max-w-[1520px]` 래퍼 안, `min-[1520px]:grid-cols-[1200px_1fr]` 2단.
- **동작**:
  - 뷰포트 ≥ 1520px: 왼쪽 열 **1200px 고정** → `BestsellerSection` 내부 그리드가 `max-w-[1200px]` 로 **가로 6권 + gap-4**.
  - 뷰포트 < 1520px: 1열 → `BestsellerSection`이 전체 폭을 쓰고, 그리드는 여전히 `max-w-[1200px] mx-auto` 로 1200px·6열 유지.
- **참고**: 3.txt 원안은 "1160px, grid-cols-5". 이후 요청으로 "1200px에 가로 6권"으로 변경해 현재는 1200px·6열로 적용됨.

---

## 3.txt 9가지 항목 대조

| # | 항목 | 3.txt 요구 | 현재 상태 | 비고 |
|---|------|------------|-----------|------|
| 1 | 메인 배너 레이아웃/속도 | 1160px 컨테이너, 배너 영역 grid [3fr 1fr](왼쪽 21:9, 오른쪽 정사각), Swiper autoplay 4000 + pauseOnMouseEnter | 히어로 1600px 풀폭 ✓. 캐러셀 autoplay·pauseOnMouseEnter ✓. **배너 옆 정사각**은 “캐러셀 아래 탭+정사각 2단”으로 구현(배너와 같은 줄 아님). | 79–80줄 “1600px 히어로 + 1160px 컨테이너”는 히어로만 반영, 본문은 1160/1200/1520 혼재 |
| 2 | 헤더 고정 방식 | header sticky 제거, 햄버거만 fixed left-4 top-4 z-50, 나머지 일반 flow | StoreHeader: 햄버거만 fixed ✓, header에 sticky 없음 ✓ | 반영됨 |
| 3 | 중앙 정렬 + 여백 통일 | max-w-[1160px] mx-auto px-4 space-y-10, HomeSection 등 wrapper | 본문이 1160/1200/1520 혼재. 공통 HomeSection wrapper 없음 | 부분 반영 |
| 4 | 팝업을 진짜 팝업으로 | StorePopup: position(좌/중앙/우), width/height, 관리자에서 설정, fixed 위치 | StorePopup: 3열 그리드·widthPx/heightPx 사용. **화면 좌/중앙/우 고정 모달 위치** 및 CMS position 필드 미반영 | 부분 반영 |
| 5 | 독립서점 추천 카드 | FeaturedCuration: 좌 표지/우 정보 flex, w-28 aspect-[2/3], 장바구니 제거·작은 링크. 상단 카테고리 그리드 제거 | 좌/우 flex, w-28, 장바구니 없음 ✓. 카테고리는 햄버거에서만 ✓ | 반영됨 |
| 6 | 책 이미지 사이즈 | 1160px, grid-cols-5, gap-5, 이미지 h-40 수준 | 사용자 후속 요청으로 **1200px, 6열, gap-4, 표지 aspect-[2/3]** 적용 (3.txt와 다름) | 의도적으로 변경됨 |
| 7 | 책소개 2줄 | description에 line-clamp-2/3, whitespace-pre-line | FeaturedCuration·MonthlyPick에 line-clamp-2/3 + whitespace-pre-line ✓ | 반영됨 |
| 8 | 카테고리 페이지 리스트 | BooksPageClient: grid → flex-col 리스트, 좌 표지/우 제목·저자·가격, max-w-[1160px] | 리스트 레이아웃 ✓, max-w-[1160px] ✓ | 반영됨 |
| 9 | 메인배너 위 대문 이미지 | HeroStrip: 낮은 가로 배너 aspect-[6/1], 텍스트 카피 | 대문은 **캐러셀 첫 슬라이드**로 통합. 별도 HeroStrip(6/1) 없음 | 다른 방식으로 구현 |

---

## 요약

- **완전 반영**: 2(헤더), 5(FeaturedCuration), 7(책소개), 8(도서 리스트).
- **부분 반영**: 1(배너 레이아웃·컨테이너 폭), 3(1160px 통일·wrapper), 4(팝업 위치/설정).
- **의도적 변경**: 6(1200px 6권), 9(대문=캐러셀 첫 슬라이드).
- **동작**: 빌드 컴파일·실행 가능. Lint 수정 시 `next build` 전체 통과 가능.
