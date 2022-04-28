import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {AppService} from "./core/app.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appService = app.get(AppService);
  appService.initialize();

  await app.listen(3000);
}
bootstrap();
