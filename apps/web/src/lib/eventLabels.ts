/** 클라이언트/서버 공용. 이벤트 유형 한글 라벨 (firebase 미의존) */
export type EventType = 'book_concert' | 'author_talk' | 'book_club' | '';

const EVENT_TYPE_LABEL: Record<string, string> = {
  book_concert: '북콘서트',
  author_talk: '공연',
  book_club: '독서모임',
};

export function getEventTypeLabel(type: string): string {
  return EVENT_TYPE_LABEL[type] ?? type;
}
