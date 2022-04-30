import {Injectable} from '@nestjs/common';
import {PrismaService} from "nestjs-prisma";
import {Prisma} from ".prisma/client";
import TradeCreateInput = Prisma.TradeCreateInput;
import CoinCreateInput = Prisma.CoinCreateInput;
import CoinUpdateInput = Prisma.CoinUpdateInput;
import {OrderResponse} from "../config/models/order-response";


@Injectable()
export class DbService {

    constructor(private prisma: PrismaService) {}

    getBasket() {
        return this.prisma.coin.findMany({});
    }

    createBasket(data: CoinCreateInput[]) {
        return this.prisma.coin.createMany({data})
    }

    async updateBasket(coins: { id: number, amount: number }[]) {
        for (const coin of coins) {
            await this.prisma.coin.update({where: {id: coin.id}, data: {amount: coin.amount}})
        }
    }

    async updateCoin(id: number, data: CoinUpdateInput) {
        await this.prisma.coin.update({where: {id: id}, data: data});
    }

    async updateCoinByAsset(asset: string, data: CoinUpdateInput) {
        await this.prisma.coin.update({where: {asset: asset}, data: data});
    }

    async updateAveragePriceBySymbol(symbol: string, avgPrice: number) {
        await this.prisma.coin.update({where: {symbol: symbol}, data: {averagePrice: avgPrice}})
    }

    async createTrade(order: OrderResponse) {
        const trades: TradeCreateInput[] = [];
        if (order.type === 'MARKET') {
            for (const fill of order.fills) {
                trades.push({
                    symbol: order.symbol,
                    side: order.side,
                    type: order.type,
                    clientOrderId: order.clientOrderId,
                    commission: +fill.commission,
                    commissionAsset: fill.commissionAsset,
                    price: +fill.price,
                    qty: +fill.qty,
                    orderId: order.orderId,
                    tradeId: fill.tradeId,
                });
            }
            await this.prisma.trade.createMany({data: trades});
        }
    }
}
