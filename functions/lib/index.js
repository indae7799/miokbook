"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestExchange = exports.cancelRegistration = exports.registerEvent = exports.createReview = exports.requestReturn = exports.cancelOrder = exports.confirmPayment = exports.syncToMeilisearch = exports.expirePendingOrders = exports.syncBookStatus = exports.reserveStock = exports.createOrder = exports.bulkCreateBooks = void 0;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
// Legacy package notice:
// `apps/web` has been migrated to Supabase-backed routes and no longer relies on
// these callable functions directly. Keep exports unchanged until production
// callers and scheduled dependencies are verified and retired.
var bulkCreateBooks_js_1 = require("./order/bulkCreateBooks.js");
Object.defineProperty(exports, "bulkCreateBooks", { enumerable: true, get: function () { return bulkCreateBooks_js_1.bulkCreateBooks; } });
var createOrder_js_1 = require("./order/createOrder.js");
Object.defineProperty(exports, "createOrder", { enumerable: true, get: function () { return createOrder_js_1.createOrder; } });
var reserveStock_js_1 = require("./inventory/reserveStock.js");
Object.defineProperty(exports, "reserveStock", { enumerable: true, get: function () { return reserveStock_js_1.reserveStock; } });
var syncBookStatus_js_1 = require("./cleanup/syncBookStatus.js");
Object.defineProperty(exports, "syncBookStatus", { enumerable: true, get: function () { return syncBookStatus_js_1.syncBookStatus; } });
var expirePendingOrders_js_1 = require("./cleanup/expirePendingOrders.js");
Object.defineProperty(exports, "expirePendingOrders", { enumerable: true, get: function () { return expirePendingOrders_js_1.expirePendingOrders; } });
var syncToMeilisearch_js_1 = require("./search/syncToMeilisearch.js");
Object.defineProperty(exports, "syncToMeilisearch", { enumerable: true, get: function () { return syncToMeilisearch_js_1.syncToMeilisearch; } });
var confirmPayment_js_1 = require("./payment/confirmPayment.js");
Object.defineProperty(exports, "confirmPayment", { enumerable: true, get: function () { return confirmPayment_js_1.confirmPayment; } });
var cancelOrder_js_1 = require("./order/cancelOrder.js");
Object.defineProperty(exports, "cancelOrder", { enumerable: true, get: function () { return cancelOrder_js_1.cancelOrder; } });
var requestReturn_js_1 = require("./order/requestReturn.js");
Object.defineProperty(exports, "requestReturn", { enumerable: true, get: function () { return requestReturn_js_1.requestReturn; } });
var createReview_js_1 = require("./review/createReview.js");
Object.defineProperty(exports, "createReview", { enumerable: true, get: function () { return createReview_js_1.createReview; } });
var registerEvent_js_1 = require("./events/registerEvent.js");
Object.defineProperty(exports, "registerEvent", { enumerable: true, get: function () { return registerEvent_js_1.registerEvent; } });
var cancelRegistration_js_1 = require("./events/cancelRegistration.js");
Object.defineProperty(exports, "cancelRegistration", { enumerable: true, get: function () { return cancelRegistration_js_1.cancelRegistration; } });
var requestExchange_js_1 = require("./order/requestExchange.js");
Object.defineProperty(exports, "requestExchange", { enumerable: true, get: function () { return requestExchange_js_1.requestExchange; } });
