import {Logger, Module} from '@nestjs/common';
import {DbService} from "./db.service";
import {TradeService} from "./trade.service";
import {BinanceService} from "./binance.service";
import {HttpModule} from "@nestjs/axios";

@Module({
    imports: [HttpModule],
    providers: [DbService, TradeService, Logger, BinanceService],
    exports: [DbService, TradeService, BinanceService]
})
export class CoreModule {
}
