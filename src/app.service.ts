import {Injectable, Logger} from '@nestjs/common';
import {HttpService} from "@nestjs/axios";
import {DbService} from "./core/db.service";
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
        setTimeout(async () => await this.synchronizeBasket(), 2000);
        setTimeout(async () => {
            await this.binanceService.storeExchangeInfo();
            await this.fetchAvgPrices();
        }, 5000);

        // setTimeout(async () => {
        //     await this.buyTest();
        // }, 10000);
    }

    @Cron('15 * * * * *')
    private async fetchPrices() {
        console.log(new Date().toTimeString().slice(0, 8) + '  ...Fetching prices');
        await this.binanceService.updateMarketPrices();
        setTimeout(async () => {
            if (this.isDataReady()) {
                const sold = await this.tradeService.sell();
                if (sold) {
                    setTimeout(async () => await this.binanceService.synchronizeBasket(), 3000);
                }
                setTimeout(async () => {
                    const busd = (await this.binanceService.basket()).find(c => c.asset === 'BUSD' || c.asset === 'USDT');
                    this.logger.log(busd)
                    if (busd.amount > 10.1){
                        this.logger.log('Found ' + busd + '$. Buy process started...');
                        await this.tradeService.buy();
                    }
                }, 6000);
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

    private async buyTest() {
        await this.binanceService.updateMarketPrices();
        setTimeout(async () => {
            if (this.binanceService.marketPrices.length > 0){
                await this.tradeService.buy();
            } else {
                console.log('Empty market prices.')
            }
        }, 5000)
    }
}
