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
