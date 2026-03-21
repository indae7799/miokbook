/**
 * 알라딘 categoryName(예: "국내도서>소설/시/희곡>소설")을
 * 우리 slug(소설, 에세이, 인문, 경제, 과학, IT)로 매핑.
 * DB/필터와 일치시켜 검색이 동작하도록 함.
 */
export function mapAladinCategoryToSlug(categoryName: string | undefined): string {
  const raw = (categoryName ?? '').trim();
  if (!raw) return '기타';

  const lower = raw.toLowerCase();
  
  // 1. 소설/문학/만화
  if (/소설|희곡|시\/희곡|문학|장르소설|만화|라이트노벨/.test(raw)) return '소설';
  
  // 2. 에세이/예술/여행
  if (/에세이|예술|대중문화|여행|시집/.test(raw) && !raw.includes('인문')) return '에세이';
  
  // 3. 인문/사회/역사/자기계발
  if (/인문|역사|사회과학|철학|종교|정치|사회학|심리학|자기계발|교육|학습/.test(raw)) return '인문';
  
  // 4. 경제경영
  if (/경제|경영|재테크|투자/.test(raw)) {
    if (/조직|인사|마케팅/.test(raw)) return '기타';
    return '경제';
  }
  
  // 5. 과학/공학/자연/건강
  if (/과학|공학|수학|자연|의학|보건|건강|다이어트/.test(raw) && !raw.includes('사회과학')) return '과학';
  
  // 6. IT/컴퓨터
  if (/컴퓨터|인터넷|it|프로그래밍|개발|모바일|웹사이트|데이터베이스/.test(lower)) return 'IT';
  
  // 7. 유아/어린이/전집 (기타로 보되 필요시 매핑)
  if (/유아|어린이|청소년/.test(raw)) return '기타';

  return '기타';
}
