import { Prisma} from ".prisma/client";
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
