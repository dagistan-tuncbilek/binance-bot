import { Injectable } from '@nestjs/common';
import {PrismaService} from "nestjs-prisma";
import { Prisma} from ".prisma/client";
import CoinCreateInput = Prisma.CoinCreateInput;


@Injectable()
export class DbService {

    constructor(private prisma: PrismaService) {}


    async getBasket() {
        return this.prisma.coin.findMany({});
    }

    async createBasket(data: CoinCreateInput[]) {
        return this.prisma.coin.createMany({ data })
    }

    async updateBasket(coins: {id: number, amount: number}[]) {
        for (const coin of coins){
            await this.prisma.coin.update({ where:{ id: coin.id}, data:{ amount: coin.amount} })
        }
    }
}
