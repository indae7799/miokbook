const ARTICLE_TYPE_LABEL: Record<string, string> = {
  author_interview: '작가 인터뷰',
  bookstore_story: '서점 이야기',
  publisher_story: '출판 이야기',
  notice: '공지사항',
};

export function getArticleTypeLabel(type: string): string {
  return ARTICLE_TYPE_LABEL[type] ?? type;
}
