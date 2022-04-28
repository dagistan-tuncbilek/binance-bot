import { Injectable } from '@nestjs/common';
import {Coin} from ".prisma/client";
import {MarketPrice} from "../config/models/market-price";
import {SellData} from "../config/models/sell-data";
import {overflowRatio} from "../config/constants";

@Injectable()
export class CalculationService {

    basket: Coin[];
    marketPrices: MarketPrice[];
    average: number;
    totalValue = 0;
    coinsCount = 0;
    sellDataArray: SellData[] = [];

    calculate(basket: Coin[], marketPrices: MarketPrice[]){
        this.basket = basket;
        this.coinsCount = basket.length - 1;
        this.marketPrices = marketPrices;
        this.totalValue = basket.find(c => c.asset === 'USDT').amount;
        for (const coin of basket){
            if (coin.symbol){
                const currentPrice = +marketPrices.find(p => p.symbol === coin.symbol).price;
                this.sellDataArray.push({
                    asset: coin.asset,
                    fiatRatio: currentPrice / coin.ratio,
                    overFlow: coin.overflow,
                    currentPrice: currentPrice,
                    amount: coin.amount,
                    ratio: coin.ratio
                });
                this.totalValue += currentPrice * coin.amount;
            }
        }
        this.average = this.sellDataArray.map(d => d.fiatRatio).reduce((a, b) => a+b, 0) / this.sellDataArray.length;
        console.log(this.sellDataArray, this.average, this.totalValue);
        this.sell();
    }

    private sell() {
        for (const data of this.sellDataArray){
            const amount: number = this.calculateSellAmount(data);
            if (amount){
                console.log('Update DB overflow');
            }
            console.log('sell ' + data.asset + ' : ' + amount);
        }
    }

    private calculateSellAmount(data: SellData): number {
        const factor = overflowRatio.find(ovf => ovf.overflow === data.overFlow).factor;
        const requiredValue = (this.totalValue / this.coinsCount) * factor;
        const requiredAmount = requiredValue / data.currentPrice;
        const difference = data.amount - requiredAmount;
        console.log('requiredUsdt: ', requiredValue, 'requiredAmount: ', requiredAmount, 'currentAmount: ', data.amount, 'difference: ', difference);
        if (difference * data.currentPrice > 15){
            return difference;
        }
        return 0;
    }
}
