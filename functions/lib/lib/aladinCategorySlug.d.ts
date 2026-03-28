/**
 * 알라딘 categoryName 문자열을 우리 서비스의 저장용 세부 카테고리로 매핑한다.
 * 종교와 만화는 운영 대상이 아니므로 별도 카테고리로 저장하지 않고 `기타`로 돌린다.
 */
export declare function mapAladinCategoryToSlug(categoryName: string | undefined): string;
