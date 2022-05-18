import {Injectable, Logger} from '@nestjs/common';
import {ComparativeCoinData} from "../config/models/comparative-coin-data";
import {MAX_COIN_RATIO, OVERFLOW_PRICE_TABLE} from "../config/constants";
import {DbService} from "./db.service";
import {ConfigService} from "@nestjs/config";
import {Environment} from "../config/enums/environment";
import {BinanceService} from "./binance.service";
import {OrderResponse} from "../config/models/order-response";
import {MarketPrice} from "../config/models/market-price";
import {Coin} from ".prisma/client";

@Injectable()
export class TradeService {

    constructor(private db: DbService, private config: ConfigService, private binanceService: BinanceService, private logger: Logger) {}

    async buy() {
        let busd = (await this.binanceService.basket()).find(c => c.asset === 'BUSD').amount;
        if (busd < 11) return;
        const buyList: { coinData: ComparativeCoinData, busd: number }[] = await this.prepareBuyList(busd);
        this.logger.log(buyList.map(item => `Buy order; ${item.busd}$ ${item.coinData.asset}`));
        this.startBuyTrade(buyList);
    }

    private async prepareBuyList(busd: number) {
        let {comparativeCoinData, totalValue, averageFiatRatio} = await this.prepareDataForTrade();
        this.logger.log('totalValue : ', totalValue);
        const avgValue = totalValue / comparativeCoinData.length;
        const buyList: { coinData: ComparativeCoinData, busd: number }[] = [];
        const newCoins = comparativeCoinData.filter(data => data.amount * data.currentPrice < 11 && data.overflow === 0);
        for (const coinData of newCoins) {
            await this.initializeOverFlow(coinData, averageFiatRatio);
        }

        const lowValueCoins = comparativeCoinData.filter(data => data.amount * data.currentPrice <= 11);
        const otherCoins = comparativeCoinData.filter(data => data.amount * data.currentPrice > 11);
        for (const coinData of lowValueCoins) {
            const tableRow = OVERFLOW_PRICE_TABLE.find(row => row.overflow === coinData.overflow);
            if (busd > 11) {
                const amount = busd > tableRow.factor * avgValue ? tableRow.factor * avgValue : busd;
                buyList.push({coinData: coinData, busd: amount - 0.1});
                busd = busd - amount;
            } else {
                break;
            }
        }

        for (const coinData of otherCoins) {
            if (busd > 11) {
                const currentValue = coinData.amount * coinData.currentPrice;
                const requiredValue = avgValue * MAX_COIN_RATIO - currentValue;
                if (requiredValue > 11){
                    const amount = busd > requiredValue ? requiredValue : busd;
                    // this.logger.log(requiredValue, coinData.asset, amount, requiredValue)
                    buyList.push({coinData: coinData, busd: amount - 0.1});
                    busd = busd - amount;
                }
            } else {
                break;
            }
        }
        return buyList;
    }

    async sell(): Promise<boolean> {
        let sold = false;
        const {comparativeCoinData, totalValue, averageFiatRatio} = await this.prepareDataForTrade();
        const sellList: {coinData: ComparativeCoinData, surplus: number}[] = [];
        for (const coinData of comparativeCoinData) {
            const surplus: number = await this.calculateSellAmount(coinData, averageFiatRatio, totalValue, comparativeCoinData.length);
            if (surplus) {
                this.logger.log('Selling ' + coinData.symbol + ' : ' + surplus);
                sellList.push({coinData, surplus});
            }
            if (sellList.length){
                this.startSellTrade(sellList);
                sold = true;
            }
            await this.decreaseOverflow(coinData, averageFiatRatio);
        }
        return sold;
    }

    private async calculateSellAmount(coinData: ComparativeCoinData, averageFiatRatio: number, totalValue: number, count: number): Promise<number> {
        const ratio = coinData.fiatRatio / averageFiatRatio;
        this.logger.log(coinData.asset, 'ratio: ' + ratio, 'Overflow Ratio: ' + (OVERFLOW_PRICE_TABLE[coinData.overflow].percentage + 100) / 100);
        if (coinData.overflow !== 6 && ratio > (OVERFLOW_PRICE_TABLE[coinData.overflow + 1].percentage + 100) / 100) {
            const priceRow = OVERFLOW_PRICE_TABLE.find(ovf => ovf.overflow === coinData.overflow + 1);
            const requiredBusd = (totalValue / count) * priceRow.factor;
            const minimumAmount = requiredBusd / coinData.currentPrice;
            const surplus = coinData.amount - minimumAmount;
            const defaultSellAmount = coinData.amount * (1 - priceRow.factor);
            const difference = defaultSellAmount < surplus ? defaultSellAmount : surplus;

            if (difference * coinData.currentPrice > 11) {
                this.logger.log('requiredBusd: ', requiredBusd, 'minimumAmount: ', minimumAmount, 'minimumAmount: ', coinData.amount, 'difference: ', difference);
                return difference;
            } else {
                this.logger.log(`${coinData.asset} overflow increased to ${coinData.overflow + 1}, but sold 0`);
                await this.db.updateCoinByAsset(coinData.asset, {overflow: coinData.overflow + 1});
                await this.binanceService.resetBasket();
            }
        }
        return 0;
    }

    private async decreaseOverflow(coinData: ComparativeCoinData, averageFiatRatio: number) {
        if (coinData.overflow === 0) {
            return;
        }
        const ratio = coinData.fiatRatio / averageFiatRatio;
        const decreasedPercentage = OVERFLOW_PRICE_TABLE[coinData.overflow - 1].percentage !== 0
            ? OVERFLOW_PRICE_TABLE[coinData.overflow - 2].percentage : 1;
        const percentage = OVERFLOW_PRICE_TABLE[coinData.overflow].percentage;
        if (ratio + (percentage - decreasedPercentage) / 100 < (percentage + 100) / 100) {
            await this.db.updateCoin(coinData.coinId, {overflow: coinData.overflow - 1});
            coinData.overflow = coinData.overflow - 1;
            await this.binanceService.resetBasket();
            this.logger.log(coinData.asset + ' Overflow decreased to: ' + coinData.overflow);
        }
    }

    private async prepareDataForTrade() {
        const basket = await this.binanceService.basket();
        let totalValue = basket.find(c => c.asset === 'BUSD').amount;
        let comparativeCoinData: ComparativeCoinData[] = [];
        for (const coin of basket) {
            if (coin.symbol !== 'BUSD' && coin.symbol !== 'USDT') {
                const currentPrice = +this.binanceService.marketPrices.find(p => p.symbol === coin.symbol).lastPrice;
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
        comparativeCoinData = comparativeCoinData.sort((a, b) => a.fiatRatio - b.fiatRatio);
        const averageFiatRatio = comparativeCoinData.map(d => d.fiatRatio).reduce((a, b) => a + b, 0) / comparativeCoinData.length;
        // this.logger.log(comparativeCoinData, averageFiatRatio, totalValue);
        return {comparativeCoinData, totalValue, averageFiatRatio};
    }

    private startBuyTrade(buyList: { coinData: ComparativeCoinData, busd: number }[]) {
        if (this.config.get('NODE_ENV') === Environment.Production) {
            const client = this.binanceService.realClient();
            for (let item of buyList){
                this.logger.log(`Buying ${item.busd}$ ${item.coinData.asset}...`)
                client.newOrder(item.coinData.symbol, 'BUY', 'MARKET', {quoteOrderQty: item.busd})
                    .then(async response => {
                        this.logger.log(response.data);
                        await this.db.createTrade(response.data);
                        await this.binanceService.resetBasket();
                        await this.binanceService.synchronizeBasket();
                    })
                    .catch(err => {
                        this.logger.log(err);
                        this.logger.error('Buy order, ', err.data, TradeService.name);
                    });
            }
        }
    }

    private startSellTrade(sellList: {coinData: ComparativeCoinData, surplus: number}[], usdt = false) {
        if (this.config.get('NODE_ENV') === Environment.Production) {
            const client = this.binanceService.realClient();
            for (const item of sellList){
                const symbol = usdt ? item.coinData.symbol.slice(0, item.coinData.symbol.length - 4) + "USDT" : item.coinData.symbol;
                this.logger.log('Selling ' + this.getValidQuantity(item.coinData.symbol, item.surplus) + ' ' + symbol);
                const quantity = this.getValidQuantity(item.coinData.symbol, item.surplus);
                client.newOrder(symbol, 'SELL', 'MARKET', {quantity: quantity})
                    .then(async response => {
                        this.logger.log(response.data);
                        const filled = (<OrderResponse>response.data).fills.reduce((a, b) => a + +b.qty, 0);
                        await this.db.updateCoinByAsset(item.coinData.asset, {
                            amount: item.coinData.amount - filled,
                            overflow: item.coinData.overflow + 1
                        });
                        await this.db.createTrade(response.data);
                        await this.binanceService.resetBasket();
                    })
                    .catch(err => {
                        this.logger.log(err);
                        this.logger.error('Find last prices request, ', err, TradeService.name)
                    });
            }
        }
    }

    private getValidQuantity(symbol: string, amount: number): number {
        const filter = this.binanceService.filters[symbol];
        const factor = 1 / filter.stepSize;
        const quantity = Math.floor(amount * factor)
        return quantity / factor;
    }

    private async initializeOverFlow(coinData: ComparativeCoinData, averageFiatRatio: number) {
        for (let i = OVERFLOW_PRICE_TABLE.length - 1; i >= 0; i--) {
            if (i !== coinData.overflow && coinData.fiatRatio / averageFiatRatio > (OVERFLOW_PRICE_TABLE[i].percentage + 100) / 100) {
                this.logger.log(coinData.asset, {overflow: i});
                coinData.overflow = i;
                await this.db.updateCoinByAsset(coinData.asset, {overflow: i});
                break;
            }
        }
    }

    async sellAll(percentage: number, marketPrices: MarketPrice[]) {
        const basket = (await this.binanceService.basket()).filter(c => c.asset !== "BUSD" && c.asset !== "USDT");
        const response = [];
        const sellList: {coinData: ComparativeCoinData, surplus: number}[] = [];
        for (const coin of basket) {
            const marketPrice = marketPrices.find(p => p.symbol === coin.symbol);
            if (coin.amount * +marketPrice.lastPrice * percentage / 100 > 10.1) {
                const coinData = TradeService.createCoinData(coin, marketPrice);
                sellList.push({coinData, surplus: coin.amount * percentage / 100});
                const symbol = coin.symbol.slice(0, coin.symbol.length - 4) + "USDT";
                response.push({message: this.getValidQuantity(coin.symbol, coin.amount * percentage / 100) + " " + symbol + " sold."});
            } else {
                response.push({message: coin.symbol + " quantity is not enough, sold 0."});
            }
        }
        if (sellList.length){
            this.startSellTrade(sellList, true);
        }
        return response;
    }

    async sellToUsdt(percentage: number, asset: string, marketPrices: MarketPrice[]) {
        const coin = (await this.binanceService.basket()).find(c => c.asset === asset);
        const marketPrice = marketPrices.find(p => p.symbol === coin.symbol);
        if (coin.amount * +marketPrice.lastPrice * percentage / 100 > 10.1) {
            const coinData = TradeService.createCoinData(coin, marketPrice);
            this.startSellTrade([{coinData, surplus: coin.amount * percentage / 100}], true);
            const symbol = coin.symbol.slice(0, coin.symbol.length - 4) + "USDT";
            return {message: this.getValidQuantity(coin.symbol, coin.amount * percentage / 100) + " " + symbol + " sold."};
        } else {
            return {message: "Quantity is not enough"};
        }
    }

    private static createCoinData(coin: Coin, marketPrice: MarketPrice) {
        return {
            amount: coin.amount,
            averagePrice: coin.averagePrice,
            overflow: coin.overflow,
            currentPrice: +marketPrice.lastPrice,
            asset: coin.asset,
            fiatRatio: -1,
            symbol: coin.symbol,
            coinId: coin.id
        }
    }
}
