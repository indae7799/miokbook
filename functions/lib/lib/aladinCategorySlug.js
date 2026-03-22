"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapAladinCategoryToSlug = mapAladinCategoryToSlug;
/**
 * 알라딘 categoryName(예: "국내도서>소설/시/희곡>소설")을
 * 우리 slug(소설, 에세이, 인문, 경제, 과학, IT, 기타)로 매핑.
 *
 * [수정 내역]
 * - 가정/요리/건강/취미/스포츠/유아/어린이/여행/참고서/자기계발 등 다수 추가
 * - 패턴 순서: 좁고 구체적인 것 먼저, 넓은 것 나중에
 *   (예: IT를 과학보다 앞에 배치하여 "컴퓨터과학" → IT 우선 매핑)
 */
function mapAladinCategoryToSlug(categoryName) {
    const raw = (categoryName ?? '').trim();
    if (!raw)
        return '기타';
    const lower = raw.toLowerCase();
    // IT / 컴퓨터 (과학 패턴보다 먼저 체크)
    if (/컴퓨터|인터넷|it|프로그래밍|개발|모바일|소프트웨어|데이터|인공지능|ai|네트워크|보안|클라우드/.test(lower))
        return 'IT';
    // 과학
    if (/과학|공학|수학|물리|화학|생물|천문|지구과학|환경/.test(raw) && !raw.includes('사회과학'))
        return '과학';
    // 경제/경영
    if (/경제|경영|투자|재테크|주식|부동산|창업|마케팅|회계|세금|재무/.test(raw))
        return '경제';
    // 소설/문학/만화
    if (/소설|희곡|시\/희곡|문학|장르소설|판타지|로맨스|무협|추리|sf|만화|웹툰|라이트노벨/.test(raw))
        return '소설';
    // 에세이/예술
    if (/에세이|수필|산문|예술|대중문화|영화|음악|미술|공연|사진|디자인|패션/.test(raw))
        return '에세이';
    // 인문
    if (/인문|역사|철학|종교|심리학|정치|사회학|사회과학|법|교육|자기계발|리더십|성공/.test(raw))
        return '인문';
    // 기타: 실용/생활/어린이/학습 등
    if (/가정|요리|육아|건강|의학|운동|스포츠|취미|여행|요가|다이어트/.test(raw) ||
        /유아|어린이|아동|초등|중학|고등|학습|교과서|참고서|수험/.test(raw) ||
        /외국어|영어|일본어|중국어|언어/.test(raw) ||
        /원예|반려동물|낚시|등산|인테리어|diy/.test(lower))
        return '기타';
    return '기타';
}
