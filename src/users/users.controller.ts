import {Controller, Post, UseGuards, Request, Get} from '@nestjs/common';
import {AuthGuard} from "@nestjs/passport";
import {LocalAuthGuard} from "./guards-strategies/local-auth.guard";
import {JwtAuthGuard} from "./guards-strategies/jwt-auth.guard";
import {UsersService} from "./users.service";

@Controller('users')
export class UsersController {

    constructor(private usersService: UsersService) {}

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req) {
        return this.usersService.login(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }
}
