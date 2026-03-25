export function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isEventClosed(dateStr: string, now = new Date()): boolean {
  const eventDate = parseEventDate(dateStr);
  if (!eventDate) return false;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const eventDayStart = new Date(eventDate);
  eventDayStart.setHours(0, 0, 0, 0);

  return todayStart.getTime() > eventDayStart.getTime();
}

export type EventButtonState = 'open' | 'open_soon' | 'closed';

/**
 * 이벤트 버튼 상태 결정:
 * - closed   : 이벤트 날짜 다음날부터 (todayStart > eventDayStart)
 * - open_soon: 이벤트 날짜 14일 이상 전 (daysUntil >= 14)
 * - open     : 이벤트 날짜 13일 이하 전 ~ 당일 (0 ≤ daysUntil ≤ 13)
 */
export function getEventButtonState(dateStr: string, now = new Date()): EventButtonState {
  const eventDate = parseEventDate(dateStr);
  if (!eventDate) return 'open';

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const eventDayStart = new Date(eventDate);
  eventDayStart.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil = Math.round((eventDayStart.getTime() - todayStart.getTime()) / msPerDay);

  if (daysUntil < 0) return 'closed';
  if (daysUntil >= 14) return 'open_soon';
  return 'open';
}
