import {Logger, Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {PrismaModule} from "nestjs-prisma";
import {PrismaConfigService} from "./config/prisma-config-service";
import {ConfigModule} from "@nestjs/config";
import {AppService} from "./core/app.service";
import {HttpModule} from "@nestjs/axios";
import {DbService} from './core/db.service';
import {ScheduleModule} from "@nestjs/schedule";
import {TradeService} from './core/trade.service';
import { BinanceService } from './core/binance.service';


@Module({
    imports: [
        HttpModule,
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
        }),
        PrismaModule.forRootAsync({
            isGlobal: true,
            useClass: PrismaConfigService,
        }),
    ],
    controllers: [AppController],
    providers: [AppService, DbService, TradeService, Logger, BinanceService],
})
export class AppModule {
}
