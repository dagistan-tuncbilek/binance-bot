import {BadRequestException, Injectable} from '@nestjs/common';
import {PrismaService} from "nestjs-prisma";
import {Coin, Prisma} from ".prisma/client";
import TradeCreateInput = Prisma.TradeCreateInput;
import CoinUpdateInput = Prisma.CoinUpdateInput;
import {OrderResponse} from "../config/models/order-response";
import {CreateCoinDto} from "../config/dto/create-coin.dto";


@Injectable()
export class DbService {

    constructor(private prisma: PrismaService) {}

    async getBasket(): Promise<Coin[]> {
        const basket: Coin[] = await this.prisma.coin.findMany({});
        if (basket.length === 0) {
            const coin = await this.prisma.coin.create({
                data: {asset: 'BUSD', symbol: 'BUSD', averagePrice: 1}
            });
            basket.push(coin);
        }
        return basket;
    }

    async createCoin(createCoinDto: CreateCoinDto) {
        try {
            return await this.prisma.coin.create({data: createCoinDto});
        } catch (ex) {
            throw new BadRequestException('Symbol and asset mus be uniq');
        }
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

    trades() {
        return this.prisma.trade.findMany({ orderBy: { createdAt: 'desc'}});
    }
}
