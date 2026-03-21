import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();

// Legacy package notice:
// `apps/web` has been migrated to Supabase-backed routes and no longer relies on
// these callable functions directly. Keep exports unchanged until production
// callers and scheduled dependencies are verified and retired.

export { bulkCreateBooks } from './order/bulkCreateBooks.js';
export { createOrder } from './order/createOrder.js';
export { reserveStock } from './inventory/reserveStock.js';
export { syncBookStatus } from './cleanup/syncBookStatus.js';
export { expirePendingOrders } from './cleanup/expirePendingOrders.js';
export { syncToMeilisearch } from './search/syncToMeilisearch.js';
export { confirmPayment } from './payment/confirmPayment.js';
export { cancelOrder } from './order/cancelOrder.js';
export { requestReturn } from './order/requestReturn.js';
export { createReview } from './review/createReview.js';
export { registerEvent } from './events/registerEvent.js';
export { cancelRegistration } from './events/cancelRegistration.js';
export { requestExchange } from './order/requestExchange.js';
