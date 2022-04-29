import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {Spot} from '@binance/connector';
import {HttpService} from "@nestjs/axios";
import {forkJoin, Observable} from "rxjs";
import {DbService} from "./db.service";
import {BINANCE_API_URL, DAILY_PRICE_LIMIT, DEFAULT_BASKET} from "../config/constants";
import {Balance} from "../config/models/balance";
import {Coin} from ".prisma/client";
import {Cron, CronExpression} from "@nestjs/schedule";
import {MarketPrice} from "../config/models/market-price";
import {TradeService} from "./trade.service";


@Injectable()
export class AppService {

    basket: Coin[] = [];
    marketPrices: MarketPrice[] = [];

    constructor(
        private config: ConfigService,
        private httpService: HttpService,
        private db: DbService,
        private tradeService: TradeService,
        private logger: Logger
    ) {}

    async initialize() {
        await this.createBasket();
        await this.storeExchangeInfo();
        // await this.synchronizeBasket();
        setTimeout(async () => {
            await this.fetchPrices();
        }, 1000);

        // await this.fetchDailyAvgPrices();
    }

    // @Cron('45 * * * * *')
    private fetchPrices() {
        console.log('Fetching prices ...')
        this.findLastPrices(DEFAULT_BASKET.filter(c => c.symbol).map(c => c.symbol)).subscribe({
            next: async (response) => {
                this.marketPrices = response.map(r => r.data);
                const sold = await this.tradeService.sell(this.basket, this.marketPrices);
                if (sold){
                    // await this.synchronizeBasket();
                    setTimeout(async () => {
                        console.log('Sold sth, now buying...');
                        // await this.tradeService.buy(this.basket, this.marketPrices);
                        // setTimeout(async () => {
                        //     await this.synchronizeBasket();
                        // }, 3000);
                    }, 3000);
                }
            },
            error: err => this.logger.error('FindLastPrices request, ', JSON.stringify(err.data), AppService.name)
        });
    }

    // @Cron(CronExpression.EVERY_5_MINUTES)
    private async synchronizeBasket() {
        console.log('Synchronizing Basket...');
        const basket = await this.db.getBasket();
        const client = new Spot(this.config.get('API_KEY'), this.config.get('SECRET_KEY'));
        client.account().then(async response => {
            // Filter the balances which have different amount then db
            let balances: Balance[] = response.data.balances.filter(b => {
                const coin = basket.find(coin => coin.asset === b.asset);
                return coin && coin.amount !== +b.free && +b.free != 0;
            });
            // console.log('balances', balances);
            const coins: { id: number, amount: number }[] = basket
                .filter(coin => balances.map(b => b.asset).includes(coin.asset))
                .map(coin => {
                    const balance = balances.find(b => b.asset === coin.asset);
                    if (balance) {
                        coin.amount = +balance.free;
                    }
                    return {id: coin.id, amount: coin.amount};
                });
            // console.log(coins);
            if (coins.length) {
                await this.db.updateBasket(coins);
            }
            this.basket = await this.db.getBasket();
            if (this.marketPrices.length && this.basket.find(c => c.asset === 'BUSD').amount > 11){
                await this.tradeService.buy(this.basket, this.marketPrices);
            }
        });
    }

    private async createBasket() {
        const basket = await this.db.getBasket();
        if (this.basket.length !== DEFAULT_BASKET.length) {
            const assets = basket.map(b => b.asset);
            await this.db.createBasket(DEFAULT_BASKET.filter(defaultBasket => !assets.includes(defaultBasket.asset)));
        }
        // For local testing
        this.basket = basket;
    }

    @Cron(CronExpression.EVERY_6_HOURS)
    async fetchDailyAvgPrices() {
        for (const symbol of DEFAULT_BASKET.filter(c => c.symbol).map(c => c.symbol)) {
            await this.fetchDailyPrices(symbol).subscribe({
                next: response => {
                    const average = response.data.reduce((a,b) => a + +b[4], 0) / DAILY_PRICE_LIMIT;
                    this.db.updateAveragePriceBySymbol(symbol, average);
                },
                error: err => this.logger.error('FetchDailyAvgPrices request, ', JSON.stringify(err.data), AppService.name)
            });
        }
    }

    private fetchDailyPrices(symbol: string): Observable<any> {
        const params = `symbol=${symbol}&interval=1d&limit=${DAILY_PRICE_LIMIT}`
        return this.httpService.get(`${BINANCE_API_URL}/api/v3/klines?${params}`);
    }

    private findLastPrices(symbols: string[]): Observable<any[]> {
        return forkJoin(
            symbols.map(symbol =>
                this.httpService.get(`${BINANCE_API_URL}/api/v3/ticker/price?symbol=${symbol}`)
            )
        )
    }

    private storeExchangeInfo(): void {
        const symbols = DEFAULT_BASKET.filter(c => c.symbol).map(c => c.symbol);
        this.httpService.get(`${BINANCE_API_URL}/api/v3/exchangeInfo?symbols=${JSON.stringify(symbols)}`)
            .subscribe({
                next: response => {
                    for (const data of response.data.symbols) {
                        const filter = data.filters.find(filter => filter.filterType === 'LOT_SIZE');
                        this.tradeService.filters[data.symbol] = {
                            maxQty: +filter.maxQty,
                            minQty: +filter.minQty,
                            stepSize: +filter.stepSize
                        }
                    }
                    // console.log(this.tradeService.filters);
                },
                error: err => this.logger.error('StoreExchangeInfo request, ', JSON.stringify(err.data), AppService.name)
            });
    }
}
