export declare const cancelOrder: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    data: {
        ok: boolean;
        orderId: string;
        alreadyProcessed: boolean;
    };
} | {
    data: {
        ok: boolean;
        orderId: string;
        alreadyProcessed?: undefined;
    };
}>>;
