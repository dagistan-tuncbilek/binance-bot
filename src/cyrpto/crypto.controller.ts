import {Controller, Get, UseGuards} from '@nestjs/common';
import {DbService} from "../core/db.service";
import {TradeService} from "../core/trade.service";
import {BinanceService} from "../core/binance.service";
import {JwtAuthGuard} from "../users/guards-strategies/jwt-auth.guard";

@Controller('crypto')
@UseGuards(JwtAuthGuard)
export class CryptoController {

    constructor(private db: DbService, private tradeService: TradeService, private binanceService: BinanceService) {}

    // @Get('sell-all')
    // sellAll(@Query('percentage') percentage: string) {
    //     return this.tradeService.sellAll(+percentage, this.binanceService.marketPrices);
    // }
    //
    // @Get('sell-to-usdt')
    // sellToUsdt(@Query('percentage') percentage: string, @Query('asset') asset: string) {
    //     return this.tradeService.sellToUsdt(+percentage, asset, this.binanceService.marketPrices);
    // }

    @Get('trades')
    getTrades() {
        return this.db.trades();
    }

    @Get('coins')
    getCoins() {
        return this.db.getBasket();
    }

    // @Post('add-coin')
    // async addCoin(@Body() createCoinDto: CreateCoinDto) {
    //     const coin = await this.db.createCoin(createCoinDto);
    //     await this.binanceService.resetBasket();
    //     setTimeout(async () => {
    //         await this.binanceService.fetchAvgPrices();
    //         await this.binanceService.storeExchangeInfo();
    //         await this.binanceService.synchronizeBasket();
    //     }, 2000);
    //     return coin;
    // }

}
