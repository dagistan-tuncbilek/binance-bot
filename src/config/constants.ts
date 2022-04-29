import {Prisma} from ".prisma/client";
import CoinCreateInput = Prisma.CoinCreateInput;

export const APP_NAME = 'dt-crypto-bot';
export const BINANCE_API_URL = "https://api.binance.com";
export const BINANCE_TEST_API_URL = "https://testnet.binance.vision";
export const DAILY_PRICE_LIMIT = 30;
export const LOG_LEVEL = 'info'; // other options warn, error, info, debug

export const DEFAULT_BASKET: CoinCreateInput[] = [
    // {symbol: 'CELRBUSD', asset: 'CELR', averagePrice: 0.045},
    // {symbol: 'HOTBUSD', asset: 'HOT', averagePrice: 0.0045},
    // {symbol: 'HBARBUSD', asset: 'HBAR', averagePrice: 0.18},
    // {symbol: 'DOTBUSD', asset: 'DOT', averagePrice: 18},
    {symbol: 'DOGEBUSD', asset: 'DOGE', averagePrice: 0.14224},
    {symbol: 'SHIBBUSD', asset: 'SHIB', averagePrice: 0.00002486},
    {symbol: 'MINABUSD', asset: 'MINA', averagePrice: 2.548},
    {symbol: '', asset: 'BUSD', averagePrice: 1},
];

export const OVERFLOW_PRICE_TABLE: { overflow: number; factor: number; percentage: number }[] = [
    {overflow: 0, factor: 1, percentage: 0},
    {overflow: 1, factor: 0.75, percentage: 2},
    {overflow: 2, factor: 0.50, percentage: 5},
    {overflow: 3, factor: 0.35, percentage: 10},
    {overflow: 4, factor: 0.20, percentage: 20},
    {overflow: 5, factor: 0.10, percentage: 50},
    {overflow: 6, factor: 0.03, percentage: 100},
];
