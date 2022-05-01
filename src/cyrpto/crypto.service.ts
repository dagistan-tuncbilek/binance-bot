import {Injectable} from '@nestjs/common';
import {DbService} from "../core/db.service";
import {BinanceService} from "../core/binance.service";
import {CreateCoinDto} from "../config/dto/create-coin.dto";

@Injectable()
export class CryptoService {

    constructor(private db: DbService, private binanceService: BinanceService) {}

    getTrades() {
        return this.db.trades();
    }

    async getBasket() {
        return {
            coins: await this.binanceService.basket(),
            marketPrices: this.binanceService.marketPrices
        }
    }

    async addCoin(createCoinDto: CreateCoinDto) {
        const coin = await this.db.createCoin(createCoinDto);
        await this.binanceService.resetBasket();
        setTimeout(async () => {
            await this.binanceService.fetchAvgPrices();
            await this.binanceService.storeExchangeInfo();
            await this.binanceService.synchronizeBasket();
        }, 2000);
        return coin;
    }

    appLogs() {
        return this.db.appLogs();
    }

    removeAppLog(id: number){
        return this.db.removeAppLog(id);
    }

    removeAllAppLogs(): Promise<{ count: number }> {
        return this.db.removeAllAppLogs();
    }
}
