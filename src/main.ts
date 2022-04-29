import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {AppService} from "./core/app.service";
import {appConfig} from "./config/app-config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, appConfig);

  const appService = app.get(AppService);
  await appService.initialize();

  await app.listen(process.env.PORT || 8080);
}
bootstrap();
