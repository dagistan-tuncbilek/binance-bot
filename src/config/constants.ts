import {Prisma} from ".prisma/client";
import CoinCreateInput = Prisma.CoinCreateInput;

export const BINANCE_API_URL = "https://api.binance.com"
export const BINANCE_TEST_API_URL = "https://testnet.binance.vision/api"

export const defaultBasket: CoinCreateInput[] = [
    {symbol: 'CELRUSDT', asset: 'CELR', ratio: 0.065},
    {symbol: 'HOTUSDT', asset: 'HOT', ratio: 0.0065},
    {symbol: 'HBARUSDT', asset: 'HBAR', ratio: 0.255},
    {symbol: 'DOTUSDT', asset: 'DOT', ratio: 24},
    {symbol: 'DOGEUSDT', asset: 'DOGE', ratio: 0.16},
    {symbol: 'SHIBUSDT', asset: 'SHIB', ratio: 0.000029},
    {symbol: 'MINAUSDT', asset: 'MINA', ratio: 3},
    {symbol: '', asset: 'USDT', ratio: 3},
];

export const overflowRatio: { overflow: number; factor: number }[] = [
    {overflow: -100, factor: 2 },
    {overflow: -50, factor: 1.9 },
    {overflow: -20, factor: 1.80 },
    {overflow: -10, factor: 1.65 },
    {overflow: -5, factor: 1.50 },
    {overflow: -2, factor: 1.25 },
    {overflow: 0, factor: 1 },
    {overflow: 2, factor: 0.75 },
    {overflow: 5, factor: 0.50 },
    {overflow: 10, factor: 0.35 },
    {overflow: 20, factor: 0.20 },
    {overflow: 50, factor: 0.10 },
    {overflow: 100, factor: 0.05 },
];
