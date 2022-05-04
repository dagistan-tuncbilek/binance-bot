import {BadRequestException, Injectable} from '@nestjs/common';
import {PrismaService} from "nestjs-prisma";
import {Coin, Prisma} from ".prisma/client";
import TradeCreateInput = Prisma.TradeCreateInput;
import CoinUpdateInput = Prisma.CoinUpdateInput;
import {OrderResponse} from "../config/models/order-response";
import {CreateCoinDto} from "../config/dto/create-coin.dto";
import {readFileSync, writeFileSync} from "fs";
import {AppLog} from "../config/models/app-log";


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
            throw new BadRequestException('Symbol and asset must be uniq');
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

    async saveLogFile(path: string) {
        const data = readFileSync(path, 'utf8');
        writeFileSync(path, '');
        const lines = data.split(/\r?\n/);
        const logs: AppLog[] = [];
        for (const line of lines) {
            if (line.trim().length) {
                const data: any = JSON.parse(line.trim());
                // if ((data.leve && data.level === 'warn') || data.level === 'error') {
                if (true){
                    const appLog = new AppLog();
                    appLog.level = data.level;
                    appLog.timestamp = new Date(data.timestamp);
                    appLog.message = typeof data.message == 'string' ? data.message : JSON.stringify(data.message);
                    appLog.context = data.context ? data.context : null;
                    appLog.stack = data.stack ? (typeof data.stack == 'string' ? data.stack : JSON.stringify(data.stack)) : null;
                    logs.push(appLog);
                }
            }
        }
        await this.prisma.appLog.createMany({ data: logs})
    }

    appLogs() {
        return this.prisma.appLog.findMany({ orderBy: { timestamp: 'desc'}});
    }

    removeAppLog(id: number){
        return this.prisma.appLog.delete({ where: { id: id }, select: { id: true } });
    }

    removeAllAppLogs(): Promise<{ count: number }> {
        return this.prisma.appLog.deleteMany({});
    }
}
