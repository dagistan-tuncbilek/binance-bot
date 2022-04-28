import {Injectable} from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {Spot} from '@binance/connector';
import {HttpService} from "@nestjs/axios";
import {forkJoin, Observable} from "rxjs";
import {DbService} from "./db.service";
import {BINANCE_API_URL, defaultBasket} from "../config/constants";
import {Balance} from "../config/models/balance";
import {Coin} from ".prisma/client";

@Injectable()
export class AppService {

    basket: Coin[] = [];
    marketPrices: { symbol: string, price: string }[] = [];

    constructor(private config: ConfigService, private httpService: HttpService, private db: DbService) {}

    async initialize() {
        this.basket = await this.db.getBasket();
        if (!this.basket.length) {
            await this.createBasket();
        }
        setInterval(() => {
            this.findLastPrices(this.basket.filter(c => c.symbol).map(c => c.symbol)).subscribe({
                next: response => {
                    this.marketPrices = response.map(r => r.data);
                    this.calculate();
                },
                error: err => console.log(err)
            });
        }, 10000);
    }

    private calculate() {
        console.log(this.marketPrices);
    }

    private findLastPrices(symbols: string[]): Observable<any[]> {
        return forkJoin(
            symbols.map(symbol =>
                this.httpService.get(`${BINANCE_API_URL}/api/v3/ticker/price?symbol=${symbol}`)
            )
        )
    }

    private async createBasket() {
        const client = new Spot(this.config.get('API_KEY'), this.config.get('SECRET_KEY'));
        client.account().then(async response => {
            const balances: Balance[] = response.data.balances.filter(b => +b.free > 0);
            console.log(balances)
            const coins = defaultBasket.map(coin => {
                const balance = balances.find(b => b.asset === coin.asset);
                if (balance) {
                    coin.amount = +balance.free;
                }
                return coin;
            });
            await this.db.createBasket(coins);
            this.basket = await this.db.getBasket();
        });
    }
}
