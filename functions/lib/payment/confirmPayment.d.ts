export declare const confirmPayment: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    data: {
        alreadyProcessed: boolean;
        status: any;
        success?: undefined;
        reason?: undefined;
        orderId?: undefined;
    };
} | {
    data: {
        success: boolean;
        reason: string;
        alreadyProcessed?: undefined;
        status?: undefined;
        orderId?: undefined;
    };
} | {
    data: {
        success: boolean;
        orderId: string;
        alreadyProcessed?: undefined;
        status?: undefined;
        reason?: undefined;
    };
}>>;
