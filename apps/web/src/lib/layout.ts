/** 랜딩·카테고리·도서 목록 등 스토어 페이지 공통 레이아웃 상수 */
export const STORE_LAYOUT = {
  /** 페이지 컨테이너 최대 너비 (랜딩, 도서 목록, 상세 등) */
  containerMaxWidth: 1200,
  /** 도서 표지 너비 (표지만: 도서명·가격 제외). 가로 유지, 세로 8px 축소 */
  coverWidth: 188,
  /** 도서 표지 높이 (188×254). 표지 이미지 세로 축소 */
  coverHeight: 254,
  /** 그리드 간격 (책과 책 사이). 16+3=19px */
  gridGap: 19,
  /** 그리드 열 수 (1200px 기준) */
  gridCols: 6,
} as const;
