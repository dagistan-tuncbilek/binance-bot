export interface OrderResponse {
    symbol: string; // 'BNBUSDT',
    orderId: number; // 3083815,
    orderListId: number; //-1,
    clientOrderId: string; //'CjjP9yJMS34cDoHlUvr0ld',
    transactTime: number; //1651229522043,
    price: string; //'0.00000000',
    origQty: string; //'0.13000000',
    executedQty: string; //'0.13000000',
    cummulativeQuoteQty: string; //'51.53200000',
    status: string; //'FILLED',
    timeInForce: string; //'GTC',
    type: string; //'MARKET',
    side: string; //'BUY',
    fills: {
        price: string; //'396.40000000',
        qty: string; //'0.06000000',
        commission: string; //'0.00000000',
        commissionAsset: string; //'BNB',
        tradeId: number; //241636
    }[]

}
