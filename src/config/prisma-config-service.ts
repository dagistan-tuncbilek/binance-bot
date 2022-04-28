import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PrismaOptionsFactory, PrismaServiceOptions} from 'nestjs-prisma';

@Injectable()
export class PrismaConfigService implements PrismaOptionsFactory {
    constructor(private configService: ConfigService) {
        // TODO inject any other service here like the `ConfigService`
    }

    createPrismaOptions(): PrismaServiceOptions | Promise<PrismaServiceOptions> {
        return {
            prismaOptions: {
                log: ['info', 'error', 'warn'],
                datasources: {
                    db: {
                        url: this.configService.get('DATABASE_URL'),
                    },
                },
                errorFormat: 'pretty',
            },
            explicitConnect: true,
        };
    }
}
