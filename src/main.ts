import {HttpAdapterHost, NestFactory} from '@nestjs/core';
import { AppModule } from './app.module';
import {AppService} from "./app.service";
import {appConfig} from "./config/app-config";
import {ValidationPipe} from "@nestjs/common";
import {PrismaClientExceptionFilter} from "nestjs-prisma";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, appConfig);

  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
  );
  app.enableCors();
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  const appService = app.get(AppService);
  await appService.initialize();

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
