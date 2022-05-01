import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { CryptoController } from './crypto.controller';
import {CoreModule} from "../core/core.module";

@Module({
  imports: [CoreModule],
  providers: [CryptoService],
  controllers: [CryptoController]
})
export class CryptoModule {}
