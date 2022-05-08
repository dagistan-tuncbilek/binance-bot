import {Prisma} from ".prisma/client";


export const APP_NAME = 'dt-crypto-bot';
export const BINANCE_API_URL = "https://api.binance.com";
export const BINANCE_TEST_API_URL = "https://testnet.binance.vision";
export const PRICE_REQUEST_LIMIT = 180;
export const PRICE_REQUEST_INTERVAL = '4h';
export const MAX_COIN_RATIO = 1.8;
export const LOG_LEVEL = 'info'; // other options warn, error, info, debug

export const OVERFLOW_PRICE_TABLE: { overflow: number; factor: number; percentage: number }[] = [
    {overflow: 0, factor: 1, percentage: 0},
    {overflow: 1, factor: 0.70, percentage: 5},
    {overflow: 2, factor: 0.50, percentage: 10},
    {overflow: 3, factor: 0.33, percentage: 20},
    {overflow: 4, factor: 0.20, percentage: 40},
    {overflow: 5, factor: 0.10, percentage: 65},
    {overflow: 6, factor: 0.03, percentage: 100},
];