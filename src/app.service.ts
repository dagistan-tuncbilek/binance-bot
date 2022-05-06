import {Injectable, Logger} from '@nestjs/common';
import {HttpService} from "@nestjs/axios";
import {DbService} from "./core/db.service";
import {BINANCE_API_URL} from "./config/constants";
import {Cron, CronExpression} from "@nestjs/schedule";
import {TradeService} from "./core/trade.service";
import {BinanceService} from "./core/binance.service";
import {join} from "path";


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

    @Cron('15 * * * * *')
    // @Cron(CronExpression.EVERY_5_MINUTES)
    private async fetchPrices() {
        console.log(new Date().toTimeString().slice(0, 8) + '  ...Fetching prices');
        const basket = await this.binanceService.basket();
        const symbols = basket.filter(c => c.symbol !== 'BUSD' && c.symbol !== 'USDT').map(c => c.symbol);
        this.binanceService.marketPrices = [];
        for (const symbol of symbols) {
            this.fetch24hrTickerPriceChangeStatistic(symbol).subscribe({
                next: response => {
                    this.binanceService.marketPrices.push(response.data);
                },
                error: err => {
                    this.logger.error('FindLastPrice request, ', err.data, AppService.name);
                    this.logger.log(err.data);
                }
            });
        }
        setTimeout(async () => {
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
        }, 15000);
    }

    // At minute 1 past every 12th hour.
    @Cron('1 */12 * * *')
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

    // At minute 2 past every 4th hour.
    @Cron('2 */4 * * *')
    async fetchAvgPrices() {
        await this.binanceService.fetchAvgPrices();
    }

    private fetch24hrTickerPriceChangeStatistic(symbol: string){
        return this.httpService.get(`${BINANCE_API_URL}/api/v3/ticker/24hr?symbol=${symbol}`)
    }

    @Cron(CronExpression.EVERY_HOUR)
    async readAppLogs() {
        console.log('Reading API logs....');
        const logPath = join(process.cwd(), 'storage', 'logger', 'combined.log');
        try {
            await this.db.saveLogFile(logPath);
        } catch (ex) {
            console.log(ex);
            this.logger.error(`API combined.log save error`, JSON.stringify(ex), AppService.name);
        }
    }

    private isDataReady(): boolean {
        return this.binanceService.marketPrices.length > 0 && Object.keys(this.binanceService.filters).length > 0;
    }
}
