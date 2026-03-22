export declare const createOrder: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    data: {
        orderId: string;
        totalPrice: number;
        shippingFee: number;
        expiresAt: string;
    };
}>>;
