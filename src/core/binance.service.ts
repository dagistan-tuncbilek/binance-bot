import {Injectable, Logger} from '@nestjs/common';
import {Coin} from ".prisma/client";
import {MarketPrice} from "../config/models/market-price";
import {BINANCE_API_URL, BINANCE_TEST_API_URL, DEFAULT_BASKET} from "../config/constants";
import {HttpService} from "@nestjs/axios";
import {LotSize} from "../config/models/lot-size";
import {Balance} from "../config/models/balance";
import {DbService} from "./db.service";
import {ConfigService} from "@nestjs/config";
import {Spot} from '@binance/connector';
import {Environment} from "../config/enums/environment";

@Injectable()
export class BinanceService {

    basket: Coin[] = [];
    marketPrices: MarketPrice[] = [];
    filters: { [key: string]: LotSize } = {};

    constructor(private httpService: HttpService, private logger: Logger, private db: DbService, private config: ConfigService,) {}

    public async synchronizeBasket() {
        if (!this.basket.length){
            this.logger.warn('Basket is empty. Not synchronizing...');
            return;
        }
        let client;
        if (this.config.get('NODE_ENV') !== Environment.Production) {
            client = this.testClient();
        } else{
            client = this.realClient();
        }

        client.account().then(async response => {
            // Filter the balances which have different amount then db
            let balances: Balance[] = response.data.balances.filter(b => {
                const coin = this.basket.find(coin => coin.asset === b.asset);
                return coin && coin.amount !== +b.free && +b.free != 0;
            });
            // console.log('balances', balances);
            const coins: { id: number, amount: number }[] = this.basket
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
                this.basket = await this.db.getBasket();
            }
        });
    }

    storeExchangeInfo(): void {
        const symbols = this.defaultBasket().filter(c => c.symbol).map(c => c.symbol);
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
                error: err => this.logger.error('StoreExchangeInfo request, ', JSON.stringify(err.data), BinanceService.name)
            });
    }

    public testClient = () => {
        return new Spot(this.config.get('TESTNET_API_KEY'), this.config.get('TESTNET_SECRET_KEY'), {
            baseURL: BINANCE_TEST_API_URL,
            enableRateLimit: true
        });
    }

    public realClient = () => {
        return new Spot(this.config.get('API_KEY'), this.config.get('SECRET_KEY'));
    }

    public defaultBasket = () => {
        return DEFAULT_BASKET(this.config.get('NODE_ENV'));
    }
}
