import {Injectable, Logger} from '@nestjs/common';
import {HttpService} from "@nestjs/axios";
import {forkJoin, Observable} from "rxjs";
import {DbService} from "./core/db.service";
import {BINANCE_API_URL} from "./config/constants";
import {Cron, CronExpression} from "@nestjs/schedule";
import {TradeService} from "./core/trade.service";
import {BinanceService} from "./core/binance.service";


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
        console.log(await this.binanceService.basket());
        setTimeout(async () => await this.synchronizeBasket(), 2000)
        setTimeout(async () => {
            await this.binanceService.storeExchangeInfo();
            await this.fetchAvgPrices();
        }, 5000);
    }

    // @Cron('45 * * * * *')
    @Cron(CronExpression.EVERY_5_MINUTES)
    private async fetchPrices() {
        console.log(new Date().toTimeString().slice(0, 8) + '  ...Fetching prices');
        const basket = await this.binanceService.basket();
        this.findLastPrices(basket.filter(c => c.symbol !== 'BUSD' && c.symbol !== 'USDT').map(c => c.symbol)).subscribe({
            next: async (response) => {
                this.binanceService.marketPrices = response.map(r => r.data);
                if (this.isDataReady()) {
                    const sold = await this.tradeService.sell();
                    if (sold) {
                        setTimeout(async () => await this.binanceService.synchronizeBasket(), 3000);
                        setTimeout(async () => {
                            console.log('Sold sth, now buying...');
                            await this.tradeService.buy();
                            setTimeout(async () => {
                                await this.synchronizeBasket();
                            }, 3000);
                        }, 6000);
                    }
                }
            },
            error: err => this.logger.error('FindLastPrices request, ', JSON.stringify(err.data), AppService.name)
        });
    }

    @Cron(CronExpression.EVERY_12_HOURS)
    public async synchronizeBasket() {
        console.log('Synchronizing Basket...');
        await this.binanceService.synchronizeBasket();
        setTimeout(async () => {
            // console.log(this.isDataReady(), this.binanceService.basket.find(c => c.asset === 'BUSD').amount > 11)
            const basket = await this.binanceService.basket();
            if (this.isDataReady() && basket.find(c => c.asset === 'BUSD').amount > 11) {
                await this.tradeService.buy();
            }
        }, 3000);
    }

    @Cron(CronExpression.EVERY_4_HOURS)
    async fetchAvgPrices() {
        await this.binanceService.fetchAvgPrices();
    }

    private findLastPrices(symbols: string[]): Observable<any[]> {
        return forkJoin(
            symbols.map(symbol =>
                this.httpService.get(`${BINANCE_API_URL}/api/v3/ticker/price?symbol=${symbol}`)
            )
        )
    }

    private isDataReady(): boolean {
        return this.binanceService.marketPrices.length > 0 && Object.keys(this.binanceService.filters).length > 0;
    }
}
