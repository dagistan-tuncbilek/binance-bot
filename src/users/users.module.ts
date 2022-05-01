import {Module} from '@nestjs/common';
import {UsersService} from './users.service';
import {UsersController} from './users.controller';
import {LocalStrategy} from "./guards-strategies/local.strategy";
import {ConfigService} from "@nestjs/config";
import {JwtModule} from '@nestjs/jwt';
import {JwtStrategy} from "./guards-strategies/jwt.strategy";
import {LocalAuthGuard} from "./guards-strategies/local-auth.guard";
import {JwtAuthGuard} from "./guards-strategies/jwt-auth.guard";

@Module({
    imports: [
        JwtModule.registerAsync({
            useFactory: async (config: ConfigService) => ({
                secret: config.get('JWT_SECRET_KEY'),
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [
        UsersService,
        LocalStrategy,
        JwtStrategy,
        LocalAuthGuard,
        JwtAuthGuard
    ],
    controllers: [UsersController]
})
export class UsersModule {
}
