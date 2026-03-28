"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapAladinCategoryToSlug = mapAladinCategoryToSlug;
/**
 * 알라딘 categoryName 문자열을 우리 서비스의 저장용 세부 카테고리로 매핑한다.
 * 종교와 만화는 운영 대상이 아니므로 별도 카테고리로 저장하지 않고 `기타`로 돌린다.
 */
function mapAladinCategoryToSlug(categoryName) {
    const raw = (categoryName ?? '').trim();
    if (!raw)
        return '기타';
    const lower = raw.toLowerCase();
    if (/유아|0~7세/.test(raw))
        return '유아';
    if (/어린이|초등/.test(raw))
        return '어린이';
    if (/초등참고서|초등학교|초등학습/.test(raw))
        return '초등참고서';
    if (/중등참고서|고등참고서|중학참고서|고교참고서|중학교|고등학교/.test(raw))
        return '중고등참고서';
    if (/자격증|공인중개사|공무원수험서|민간자격|국가기술자격|검정고시/.test(raw))
        return '수험서/자격증';
    if (/취업|수험서|공무원|토익|토플|teps|leet|meet|deet|psat|ncs/.test(lower))
        return '수험서/자격증';
    if (/만화|라이트노벨/.test(raw))
        return '기타';
    if (/청소년/.test(raw))
        return '청소년';
    if (/소설|추리|sf|판타지|로맨스|무협|고전|문학/.test(raw))
        return '소설';
    if (/시|에세이|산문|수필/.test(raw))
        return '시/에세이';
    if (/인문|철학|심리|교육/.test(raw))
        return '인문';
    if (/역사|문화/.test(raw))
        return '역사/문화';
    if (/사회과학|정치|사회|행정|법|언론|여성|젠더/.test(raw))
        return '사회/정치';
    if (/경제|경영|재테크|투자|마케팅|재무|회계/.test(raw))
        return '경제/경영';
    if (/자기계발|성공|리더십|인간관계/.test(raw))
        return '자기계발';
    if (/종교/.test(raw))
        return '기타';
    if (/건강|의학|한의학|다이어트/.test(raw))
        return '건강';
    if (/취미|실용|스포츠|요리|가정|살림|반려동물|원예/.test(raw))
        return '취미/실용/스포츠';
    if (/여행|지도/.test(raw))
        return '여행';
    if (/외국어|영어|일본어|중국어|한자|프랑스어|스페인어/.test(raw))
        return '외국어';
    if (/과학|수학|물리|화학|생명과학|천문|지구과학/.test(raw))
        return '과학';
    if (/컴퓨터|모바일|프로그래밍|개발|데이터베이스|인공지능|it/.test(lower))
        return '컴퓨터/IT';
    if (/예술|대중문화|영화|음악|미술|디자인|사진/.test(raw))
        return '예술/대중문화';
    return '기타';
}
