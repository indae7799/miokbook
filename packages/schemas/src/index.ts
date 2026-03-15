export * from './book.schema';
export * from './order.schema';
export * from './user.schema';
export * from './cms.schema';
export * from './event.schema';
export * from './review.schema';
export * from './content.schema';

export const ErrorCode = {
  STOCK_SHORTAGE:        'STOCK_SHORTAGE',
  ORDER_NOT_FOUND:       'ORDER_NOT_FOUND',
  ORDER_EXPIRED:         'ORDER_EXPIRED',
  PAYMENT_FAILED:        'PAYMENT_FAILED',
  PAYMENT_CANCELLED:     'PAYMENT_CANCELLED',
  EVENT_FULL:            'EVENT_FULL',          // 이벤트 정원 초과
  ALREADY_REGISTERED:    'ALREADY_REGISTERED',  // 이벤트 중복 신청
  UNAUTHORIZED:          'UNAUTHORIZED',
  FORBIDDEN:             'FORBIDDEN',
  VALIDATION_ERROR:      'VALIDATION_ERROR',
  INTERNAL_ERROR:        'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
export type ApiResponse<T> = { data: T } | { error: ErrorCode };
