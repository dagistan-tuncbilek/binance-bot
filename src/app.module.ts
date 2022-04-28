import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {PrismaModule} from "nestjs-prisma";
import {PrismaConfigService} from "./config/prisma-config-service";
import {ConfigModule} from "@nestjs/config";
import {AppService} from "./core/app.service";
import {HttpModule} from "@nestjs/axios";
import { DbService } from './core/db.service';


@Module({
    imports: [
        HttpModule,
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
    providers: [AppService, DbService],
})
export class AppModule {
}
