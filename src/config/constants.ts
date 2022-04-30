import {Prisma} from ".prisma/client";
import CoinCreateInput = Prisma.CoinCreateInput;

export const APP_NAME = 'dt-crypto-bot';
export const BINANCE_API_URL = "https://api.binance.com";
export const BINANCE_TEST_API_URL = "https://testnet.binance.vision";
export const PRICE_REQUEST_LIMIT = 180;
export const PRICE_REQUEST_INTERVAL = '4h';
export const LOG_LEVEL = 'info'; // other options warn, error, info, debug

export const DEFAULT_BASKET = (NODE_ENV: string) => {
    if (NODE_ENV === 'Production'){
        return [
            {symbol: 'HBARBUSD', asset: 'HBAR', averagePrice: 999999},
            {symbol: 'DOTBUSD', asset: 'DOT', averagePrice: 999999},
            {symbol: 'MINABUSD', asset: 'MINA', averagePrice: 999999},
            {symbol: '', asset: 'BUSD', averagePrice: 1},
        ];
    } else {
        return [
            {symbol: 'BTCBUSD', asset: 'BTC', averagePrice: 999999},
            {symbol: 'ALGOBUSD', asset: 'ALGO', averagePrice: 999999},
            {symbol: 'CELOBUSD', asset: 'CELO', averagePrice: 999999},
            {symbol: 'DENTBUSD', asset: 'DENT', averagePrice: 999999},
            {symbol: 'SXPBUSD', asset: 'SXP', averagePrice: 999999},
            {symbol: 'ENJBUSD', asset: 'ENJ', averagePrice: 999999},
            {symbol: 'SOLBUSD', asset: 'SOL', averagePrice: 999999},
            {symbol: 'ETHBUSD', asset: 'ETH', averagePrice: 999999},
            {symbol: 'BNBBUSD', asset: 'BNB', averagePrice: 999999},
            {symbol: 'SRMBUSD', asset: 'SRM', averagePrice: 999999},
            {symbol: 'FILBUSD', asset: 'FIL', averagePrice: 999999},
            {symbol: 'ADABUSD', asset: 'ADA', averagePrice: 999999},
            {symbol: 'ASTRBUSD', asset: 'ASTR', averagePrice: 999999},
            {symbol: 'CHZBUSD', asset: 'CHZ', averagePrice: 999999},
            {symbol: 'CELRBUSD', asset: 'CELR', averagePrice: 999999},
            {symbol: 'HOTBUSD', asset: 'HOT', averagePrice: 999999},
            {symbol: 'HBARBUSD', asset: 'HBAR', averagePrice: 999999},
            {symbol: 'DOTBUSD', asset: 'DOT', averagePrice: 999999},
            {symbol: 'DOGEBUSD', asset: 'DOGE', averagePrice: 999999},
            {symbol: 'SHIBBUSD', asset: 'SHIB', averagePrice: 999999},
            {symbol: 'MINABUSD', asset: 'MINA', averagePrice: 999999},
            {symbol: '', asset: 'BUSD', averagePrice: 1},
        ];
    }
}

export const OVERFLOW_PRICE_TABLE: { overflow: number; factor: number; percentage: number }[] = [
    {overflow: 0, factor: 1, percentage: 0},
    {overflow: 1, factor: 0.75, percentage: 2},
    {overflow: 2, factor: 0.50, percentage: 5},
    {overflow: 3, factor: 0.35, percentage: 10},
    {overflow: 4, factor: 0.20, percentage: 20},
    {overflow: 5, factor: 0.10, percentage: 50},
    {overflow: 6, factor: 0.03, percentage: 100},
];
