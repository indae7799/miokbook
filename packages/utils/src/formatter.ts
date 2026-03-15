import { format } from 'date-fns';

/**
 * PRD TASKS: formatPrice(price: number): string → "15,000원"
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

/**
 * PRD TASKS: formatDate(date: Date): string → "2025. 3. 15"
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy. M. d');
}

/**
 * PRD TASKS: truncateText(text: string, maxLength: number): string
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}
