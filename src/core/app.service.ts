import {Injectable, Logger} from '@nestjs/common';
import {HttpService} from "@nestjs/axios";
import {forkJoin, Observable} from "rxjs";
import {DbService} from "./db.service";
import {BINANCE_API_URL, DAILY_PRICE_LIMIT, DEFAULT_BASKET} from "../config/constants";
import {Cron, CronExpression} from "@nestjs/schedule";
import {TradeService} from "./trade.service";
import {BinanceService} from "./binance.service";


@Injectable()
export class AppService {

    constructor(
        private httpService: HttpService,
        private db: DbService,
        private tradeService: TradeService,
        private binanceService: BinanceService,
        private logger: Logger
    ) {}

    async initialize() {
        await this.createBasket();
        await this.binanceService.storeExchangeInfo();
        await this.synchronizeBasket();
        await this.fetchDailyAvgPrices();
    }

    @Cron('45 * * * * *')
    private fetchPrices() {
        console.log('Fetching prices ...')
        this.findLastPrices(DEFAULT_BASKET.filter(c => c.symbol).map(c => c.symbol)).subscribe({
            next: async (response) => {
                this.binanceService.marketPrices = response.map(r => r.data);
                const sold = await this.tradeService.sell();
                if (sold){
                    setTimeout(async () => await this.binanceService.synchronizeBasket(), 3000);
                    setTimeout(async () => {
                        console.log('Sold sth, now buying...');
                        await this.tradeService.buy();
                        setTimeout(async () => {
                            await this.synchronizeBasket();
                        }, 3000);
                    }, 6000);
                }
            },
            error: err => this.logger.error('FindLastPrices request, ', JSON.stringify(err.data), AppService.name)
        });
    }

    public async synchronizeBasket() {
        console.log('Synchronizing Basket...');
        await this.binanceService.synchronizeBasket();
        setTimeout(async () => {
            console.log(this.binanceService.basket.find(c => c.asset === 'BUSD').amount)
            if (this.binanceService.marketPrices.length && this.binanceService.basket.find(c => c.asset === 'BUSD').amount > 11) {
                await this.tradeService.buy();
            }
        }, 3000);
    }

    private async createBasket() {
        const basket = await this.db.getBasket();
        if (this.binanceService.basket.length !== DEFAULT_BASKET.length) {
            const assets = basket.map(b => b.asset);
            await this.db.createBasket(DEFAULT_BASKET.filter(defaultBasket => !assets.includes(defaultBasket.asset)));
            this.binanceService.basket = await this.db.getBasket();
        } else {
            this.binanceService.basket = basket;
        }
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
}
