import {Controller, Delete, Get, Param, UseGuards} from '@nestjs/common';
import {TradeService} from "../core/trade.service";
import {JwtAuthGuard} from "../users/guards-strategies/jwt-auth.guard";
import {CryptoService} from "./crypto.service";


@Controller('crypto')
@UseGuards(JwtAuthGuard)
export class CryptoController {

    constructor(private cryptoService: CryptoService, private tradeService: TradeService) {}

    @Get('trades')
    getTrades() {
        return this.cryptoService.getTrades();
    }

    @Get('coins')
    getBasket() {
        return this.cryptoService.getBasket();
    }

    // @Get('sell-all')
    // sellAll(@Query('percentage') percentage: string) {
    //     return this.tradeService.sellAll(+percentage, this.binanceService.marketPrices);
    // }
    //
    // @Get('sell-to-usdt')
    // sellToUsdt(@Query('percentage') percentage: string, @Query('asset') asset: string) {
    //     return this.tradeService.sellToUsdt(+percentage, asset, this.binanceService.marketPrices);
    // }
    //
    // @Post('add-coin')
    // async addCoin(@Body() createCoinDto: CreateCoinDto) {
    //     return this.cryptoService.addCoin(createCoinDto);
    // }

    @Get('app-logs')
    appLogs() {
        return this.cryptoService.appLogs();
    }

    @Get('delete-all')
    removeAll() {
        return this.cryptoService.removeAllAppLogs();
    }

    @Delete('app-logs/:id')
    remove(@Param('id') id: string) {
        return this.cryptoService.removeAppLog(+id);
    }
}