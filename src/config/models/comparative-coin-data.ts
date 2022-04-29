export interface ComparativeCoinData {
    coinId: number;
    symbol: string;
    asset: string;
    fiatRatio: number;
    overflow: number;
    currentPrice: number;
    amount: number;
    averagePrice: number;
}