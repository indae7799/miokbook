/**
 * 알라딘 categoryName(예: "국내도서>소설/시/희곡>소설")을
 * 우리 slug(소설, 에세이, 인문, 경제, 과학, IT, 기타)로 매핑.
 *
 * [수정 내역]
 * - 가정/요리/건강/취미/스포츠/유아/어린이/여행/참고서/자기계발 등 다수 추가
 * - 패턴 순서: 좁고 구체적인 것 먼저, 넓은 것 나중에
 *   (예: IT를 과학보다 앞에 배치하여 "컴퓨터과학" → IT 우선 매핑)
 */
export declare function mapAladinCategoryToSlug(categoryName: string | undefined): string;
