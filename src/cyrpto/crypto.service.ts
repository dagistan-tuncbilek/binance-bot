import {Injectable} from '@nestjs/common';
import {DbService} from "../core/db.service";
import {BinanceService} from "../core/binance.service";
import {CreateCoinDto} from "../config/dto/create-coin.dto";
import {RemoveCoinDto} from "../config/dto/remove-coin.dto";

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
        this.binanceService.updateData();
        return coin;
    }

    async removeCoin(removeCoinDto: RemoveCoinDto) {
        const coin = await this.db.removeCoin(removeCoinDto);
        await this.binanceService.resetBasket();
        this.binanceService.updateData();
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
