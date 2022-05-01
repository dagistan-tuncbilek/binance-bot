import {BadRequestException, Injectable, UnauthorizedException} from '@nestjs/common';
import {User} from "./entitiy/user.entity";
import { JwtService } from '@nestjs/jwt';
import {PrismaService} from "nestjs-prisma";
import {randomBytes, scrypt as _scrypt} from "crypto";
import {promisify} from "util";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class UsersService {

    constructor(private jwtService: JwtService, private prisma: PrismaService, private config: ConfigService) {}

    async findOne(username: string): Promise<User | undefined> {
        return this.prisma.user.findFirst({ where: { username }});
    }

    async validateUser(username: string, password: string): Promise<any> {
        const user = await this.findOne(username);
        if (!user){
            throw new UnauthorizedException();
        }
        const [salt, storedHash] = user.password.split('.');
        const hash = await this.hashPassword(password, salt);
        console.log(hash)
        if (hash === user.password) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.userId };
        return {
            access_token: this.jwtService.sign(payload, {expiresIn: '7d'}),
        };
    }

    async hashPassword(password: string, salt = ''){
        const scrypt = promisify(_scrypt);
        if (!salt){
            salt = randomBytes(8).toString('hex');
        }
        const buffer = (await scrypt(password, salt + this.config.get('HASH_KEY'), 32)) as Buffer;
        const hash = buffer.toString('hex');
        return salt + '.' + hash;
    }
}
