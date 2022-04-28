import {Injectable} from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {Spot} from '@binance/connector';
import {HttpService} from "@nestjs/axios";
import {forkJoin, Observable} from "rxjs";
import {DbService} from "./db.service";
import {BINANCE_API_URL, defaultBasket} from "../config/constants";
import {Balance} from "../config/models/balance";
import {Coin, Prisma} from ".prisma/client";
import {Cron, CronExpression} from "@nestjs/schedule";
import {MarketPrice} from "../config/models/market-price";
import {CalculationService} from "./calculation.service";

@Injectable()
export class AppService {

    basket: Coin[] = [];
    // marketPrices: { symbol: string, price: string }[] = [];

    constructor(private config: ConfigService, private httpService: HttpService, private db: DbService, private calculationService: CalculationService) {}

    async initialize() {
        await this.createBasket();
        // await this.synchronizeBasket();
    }

    @Cron('45 * * * * *')
    private fetchPrices() {
        console.log('Fetching prices ...')
        this.findLastPrices(this.basket.filter(c => c.symbol).map(c => c.symbol)).subscribe({
            next: response => {
                const marketPrices: MarketPrice[] = response.map(r => r.data);
                this.calculationService.calculate(this.basket, marketPrices);
            },
            error: err => console.log(err)
        });
    }

    private findLastPrices(symbols: string[]): Observable<any[]> {
        return forkJoin(
            symbols.map(symbol =>
                this.httpService.get(`${BINANCE_API_URL}/api/v3/ticker/price?symbol=${symbol}`)
            )
        )
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    private async synchronizeBasket() {
        console.log('Synchronizing Basket...');
        const basket = await this.db.getBasket();
        const client = new Spot(this.config.get('API_KEY'), this.config.get('SECRET_KEY'));
        client.account().then(async response => {
            // Filter the balances which have different amount then db
            let balances: Balance[] = response.data.balances.filter(b => {
                const coin = basket.find(coin => coin.asset === b.asset);
                if (coin && coin.amount !== +b.free && +b.free != 0) {
                    return true;
                }
                return false;
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
        });
    }

    private async createBasket() {
        const basket = await this.db.getBasket();
        if (this.basket.length !== defaultBasket.length) {
            const assets = basket.map(b => b.asset);
            await this.db.createBasket(defaultBasket.filter(defaultBasket => !assets.includes(defaultBasket.asset)));
        }
        // For local testing
        this.basket = basket;
    }
}
