import {Logger, Module} from '@nestjs/common';
import {PrismaModule} from "nestjs-prisma";
import {PrismaConfigService} from "./config/prisma-config-service";
import {ConfigModule} from "@nestjs/config";
import {AppService} from "./app.service";
import {HttpModule} from "@nestjs/axios";
import {DbService} from './core/db.service';
import {ScheduleModule} from "@nestjs/schedule";
import {TradeService} from './core/trade.service';
import {BinanceService} from './core/binance.service';
import {UsersModule} from './users/users.module';
import {CryptoModule} from './cyrpto/crypto.module';
import { CoreModule } from './core/core.module';


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
        UsersModule,
        CryptoModule,
        CoreModule,
    ],
    providers: [AppService, Logger],
})
export class AppModule {
}
