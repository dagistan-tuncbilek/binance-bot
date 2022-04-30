import {Injectable, Logger} from '@nestjs/common';
import {ComparativeCoinData} from "../config/models/comparative-coin-data";
import {OVERFLOW_PRICE_TABLE} from "../config/constants";
import {DbService} from "./db.service";
import {ConfigService} from "@nestjs/config";
import {Environment} from "../config/enums/environment";
import {BinanceService} from "./binance.service";
import {OrderResponse} from "../config/models/order-response";

@Injectable()
export class TradeService {

    constructor(private db: DbService, private config: ConfigService, private binanceService: BinanceService, private logger: Logger) {}

    async buy() {
        let busd = this.binanceService.basket.find(c => c.asset === 'BUSD').amount;
        if (busd < 11) return;
        const buyList: {coinData:  ComparativeCoinData, busd: number}[] = await this.prepareBuyList(busd);
        for (const item of buyList){
            console.log(`Buying ${item.coinData.symbol}, amount ${item.busd}`);
            this.startBuyTrade(item.coinData, busd);
        }
    }

    private async prepareBuyList(busd: number) {
        let {comparativeCoinData, totalValue, averageFiatRatio} = this.prepareDataForTrade();
        console.log('totalValue : ', totalValue);
        const avgValue = totalValue / comparativeCoinData.length;
        const buyList: {coinData:  ComparativeCoinData, busd: number}[] = [];
        comparativeCoinData = comparativeCoinData.sort((a, b) => a.fiatRatio - b.fiatRatio);
        const newCoins = comparativeCoinData.filter(data => data.amount * data.currentPrice < 10 && data.overflow === 0);
        for (const coinData of newCoins) {
            await this.initializeOverFlow(coinData, averageFiatRatio);
        }

        const lowValueCoins = comparativeCoinData.filter(data => data.amount * data.currentPrice <= 10);
        const otherCoins = comparativeCoinData.filter(data => data.amount * data.currentPrice > 10);
        for (const coinData of lowValueCoins){
            const tableRow = OVERFLOW_PRICE_TABLE.find(row => row.overflow === coinData.overflow);
            if (busd > 10){
                const amount = busd > tableRow.factor * avgValue ? tableRow.factor * avgValue : busd;
                buyList.push({coinData: coinData, busd: amount });
                busd = busd - amount;
            } else {
                break;
            }
        }
        for (const coinData of otherCoins){
            if (busd > 10){
                const requiredValue = avgValue * 2 - coinData.amount * coinData.currentPrice;
                const amount = busd > requiredValue ? requiredValue : busd;
                buyList.push({coinData: coinData, busd: amount });
                busd = busd - amount;
            } else {
                break;
            }
        }
        return buyList;
    }

    async sell(): Promise<boolean> {
        let sold = false;
        const {comparativeCoinData, totalValue, averageFiatRatio} = this.prepareDataForTrade();
        for (const coinData of comparativeCoinData) {
            const surplus: number = this.calculateSellAmount(coinData, averageFiatRatio, totalValue, comparativeCoinData.length);
            if (surplus) {
                console.log('Selling ' + coinData.symbol + ' : ' + surplus);
                this.startSellTrade(coinData, surplus);
                sold = true;
            }
            await this.decreaseOverflow(coinData, averageFiatRatio);
        }
        return sold;
    }

    private calculateSellAmount(coinData: ComparativeCoinData, averageFiatRatio: number, totalValue: number, count: number): number {
        const ratio = coinData.fiatRatio / averageFiatRatio;
        console.log(coinData.asset, 'ratio: ' + ratio, 'Overflow Ratio: ' + (OVERFLOW_PRICE_TABLE[coinData.overflow].percentage + 100) / 100);
        if (coinData.overflow !== 6 && ratio > (OVERFLOW_PRICE_TABLE[coinData.overflow + 1].percentage + 100) / 100) {
            const priceRow = OVERFLOW_PRICE_TABLE.find(ovf => ovf.overflow === coinData.overflow + 1);
            const requiredBusd = (totalValue / count) * priceRow.factor;
            const requiredAmount = requiredBusd / coinData.currentPrice;
            const difference = coinData.amount - requiredAmount;
            if (difference * coinData.currentPrice > 11) {
                console.log('requiredBusd: ', requiredBusd, 'requiredAmount: ', requiredAmount, 'currentAmount: ', coinData.amount, 'difference: ', difference);
                return difference;
            }
        }
        return 0;
    }

    private async decreaseOverflow(data: ComparativeCoinData, averageFiatRatio: number) {
        if (data.overflow === 0) {
            return;
        }
        const ratio = data.fiatRatio / averageFiatRatio;
        for (let i = 0; i < OVERFLOW_PRICE_TABLE.length; i++) {
            if (data.overflow > i && ratio < (OVERFLOW_PRICE_TABLE[i].percentage + 100) / 100) {
                await this.db.updateCoin(data.coinId, {overflow: i});
                data.overflow = i;
                console.log(data.asset + ' Overflow decreased to: ' + i)
                break;
            }
        }
    }

    private prepareDataForTrade() {
        let totalValue = this.binanceService.basket.find(c => c.asset === 'BUSD').amount;
        const comparativeCoinData: ComparativeCoinData[] = [];
        for (const coin of this.binanceService.basket) {
            if (coin.symbol) {
                const currentPrice = +this.binanceService.marketPrices.find(p => p.symbol === coin.symbol).price;
                comparativeCoinData.push({
                    coinId: coin.id,
                    symbol: coin.symbol,
                    asset: coin.asset,
                    fiatRatio: currentPrice / coin.averagePrice,
                    overflow: coin.overflow,
                    currentPrice: currentPrice,
                    amount: coin.amount,
                    averagePrice: coin.averagePrice
                });
                totalValue += currentPrice * coin.amount;
            }
        }
        const averageFiatRatio = comparativeCoinData.map(d => d.fiatRatio).reduce((a, b) => a + b, 0) / comparativeCoinData.length;
        // console.log(comparativeCoinData, averageFiatRatio, totalValue);
        return {comparativeCoinData, totalValue, averageFiatRatio};
    }

    private startBuyTrade(coinData: ComparativeCoinData, busd: number) {
        if (this.config.get('NODE_ENV') === Environment.Production) {
            const client = this.binanceService.realClient();
            client.newOrder(coinData.symbol, 'BUY', 'MARKET', {quoteOrderQty: busd})
                .then(async response => {
                    this.logger.log(response.data);
                    await this.db.createTrade(response.data);
                    await this.binanceService.synchronizeBasket();
                })
                .catch(err => {
                    console.log(err);
                    this.logger.error('Buy order, ', err.data, TradeService.name);
                });
        }
    }

    private startSellTrade(coinData: ComparativeCoinData, surplus: number) {
        console.log('quantity', this.getValidQuantity(coinData.symbol, surplus));
        if (this.config.get('NODE_ENV') === Environment.Production) {
            const client = this.binanceService.realClient();
            const quantity = this.getValidQuantity(coinData.symbol, surplus);
            client.newOrder(coinData.symbol, 'SELL', 'MARKET', {quantity: quantity})
                .then(async response => {
                    client.logger.log(response.data);
                    const filled = (<OrderResponse>response.data).fills.reduce((a, b) => a + +b.qty, 0);
                    await this.db.updateCoinByAsset(coinData.asset, {
                        amount: coinData.amount - filled,
                        overflow: coinData.overflow + 1
                    });
                    await this.db.createTrade(response.data);
                })
                .catch(err => {
                    console.log(err);
                    this.logger.error('Find last prices request, ', JSON.stringify(err), TradeService.name)
                });
        }
    }

    private getValidQuantity(symbol: string, amount: number): number {
        const filter = this.binanceService.filters[symbol];
        const factor = 1 / filter.stepSize;
        const quantity = Math.floor(amount * factor)
        console.log(quantity * filter.stepSize);
        return quantity * filter.stepSize;
    }

    private async initializeOverFlow(coinData: ComparativeCoinData, averageFiatRatio: number) {
        for (let i = OVERFLOW_PRICE_TABLE.length -1 ; i >= 0 ; i--){
            if (i !== coinData.overflow && coinData.fiatRatio / averageFiatRatio > (OVERFLOW_PRICE_TABLE[i].percentage + 100) / 100){
                console.log(coinData.asset, { overflow: i });
                coinData.overflow = i;
                await this.db.updateCoinByAsset(coinData.asset, { overflow: i });
                break;
            }
        }
    }
}
