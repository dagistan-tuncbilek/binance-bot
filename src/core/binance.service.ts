import {Injectable, Logger} from '@nestjs/common';
import {Coin} from ".prisma/client";
import {MarketPrice} from "../config/models/market-price";
import {BINANCE_API_URL, PRICE_REQUEST_INTERVAL, PRICE_REQUEST_LIMIT} from "../config/constants";
import {HttpService} from "@nestjs/axios";
import {LotSize} from "../config/models/lot-size";
import {Balance} from "../config/models/balance";
import {DbService} from "./db.service";
import {ConfigService} from "@nestjs/config";
import {Spot} from '@binance/connector';
import {Observable} from "rxjs";

@Injectable()
export class BinanceService {

    private _basket: Coin[] = [];
    marketPrices: MarketPrice[] = [];
    filters: { [key: string]: LotSize } = {};

    constructor(private httpService: HttpService, private logger: Logger, private db: DbService, private config: ConfigService,) {}

    public basket = async () => {
        if (!this._basket.length) {
            this._basket = await this.db.getBasket();
        }
        return this._basket.slice();
    }

    public async resetBasket() {
        this._basket = [];
        await this.basket();
    }

    public async synchronizeBasket() {
        const client = this.realClient();
        client.account().then(async response => {
            // Filter the balances which have different amount then db
            let balances: Balance[] = response.data.balances.filter(async b => {
                const coin = (await this.basket()).find(coin => coin.asset === b.asset);
                return coin && coin.amount !== +b.free && +b.free != 0;
            });
            // console.log('balances', balances);
            const coins: { id: number, amount: number }[] = (await this.basket())
                .filter(coin => {
                    const balance = balances.find(b => b.asset === coin.asset);
                    return balance && +balance.free !== coin.amount;
                })
                .map(coin => {
                    const balance = balances.find(b => b.asset === coin.asset);
                    if (balance) {
                        coin.amount = +balance.free;
                    }
                    return {id: coin.id, amount: coin.amount};
                });
            if (coins.length) {
                console.log('database updating...', coins);
                await this.db.updateBasket(coins);
                await this.resetBasket();
            }
        });
    }

    async fetchAvgPrices() {
        const basket = await this.basket();
        for (const symbol of basket.filter(c => c.symbol !== 'BUSD' && c.symbol !== 'USDT').map(c => c.symbol)) {
            await this.fetchPricesForPeriod(symbol).subscribe({
                next: response => {
                    const average = response.data.reduce((a,b) => a + +b[4], 0) / PRICE_REQUEST_LIMIT;
                    this.db.updateAveragePriceBySymbol(symbol, average);
                },
                error: err => {
                    this.logger.error('FetchDailyAvgPrices request, ', JSON.stringify(err.data), BinanceService.name);
                    this.logger.log(err);
                }
            });
        }
    }

    private fetchPricesForPeriod(symbol: string): Observable<any> {
        const params = `symbol=${symbol}&interval=${PRICE_REQUEST_INTERVAL}&limit=${PRICE_REQUEST_LIMIT}`
        return this.httpService.get(`${BINANCE_API_URL}/api/v3/klines?${params}`);
    }

    async storeExchangeInfo(): Promise<void> {
        const basket = await this.basket();
        if (basket.length < 2) return;
        const symbols = basket.filter(c => c.symbol !== 'BUSD' && c.symbol !== 'USDT').map(c => c.symbol);
        this.httpService.get(`${BINANCE_API_URL}/api/v3/exchangeInfo?symbols=${JSON.stringify(symbols)}`)
            .subscribe({
                next: response => {
                    for (const data of response.data.symbols) {
                        const filter = data.filters.find(filter => filter.filterType === 'LOT_SIZE');
                        this.filters[data.symbol] = {
                            maxQty: +filter.maxQty,
                            minQty: +filter.minQty,
                            stepSize: +filter.stepSize
                        }
                    }
                    // console.log('Filters: ', this.filters);
                },
                error: err => {
                    console.log(err);
                    this.logger.error('StoreExchangeInfo request, ', JSON.stringify(err.data), BinanceService.name);
                }
            });
    }

    // public testClient = () => {
    //     return new Spot(this.config.get('TESTNET_API_KEY'), this.config.get('TESTNET_SECRET_KEY'), {
    //         baseURL: BINANCE_TEST_API_URL
    //     });
    // }

    public realClient = () => {
        return new Spot(this.config.get('API_KEY'), this.config.get('SECRET_KEY'));
    }

    async updateMarketPrices() {
        const basket = await this.basket();
        const symbols = basket.filter(c => c.symbol !== 'BUSD' && c.symbol !== 'USDT').map(c => c.symbol);
        this.marketPrices = [];
        for (const symbol of symbols) {
            this.fetch24hrTickerPriceChangeStatistic(symbol).subscribe({
                next: response => {
                    this.marketPrices.push(response.data);
                },
                error: err => {
                    this.logger.error('FindLastPrice request, ', err.data, BinanceService.name);
                    this.logger.log(err.data);
                }
            });
        }
    }

    private fetch24hrTickerPriceChangeStatistic(symbol: string){
        return this.httpService.get(`${BINANCE_API_URL}/api/v3/ticker/24hr?symbol=${symbol}`)
    }

    updateData() {
        setTimeout(async () => {
            await this.fetchAvgPrices();
            await this.storeExchangeInfo();
            await this.synchronizeBasket();
        }, 3000);
    }
}
