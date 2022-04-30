import {utilities as nestWinstonModuleUtilities, WinstonModule} from 'nest-winston';
import * as winston from 'winston';
import {APP_NAME, LOG_LEVEL} from "./constants";
import {join} from "path";

export const appConfig = {
    logger: WinstonModule.createLogger({
        transports: [
            // No need for production
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.ms(),
                    nestWinstonModuleUtilities.format.nestLike(APP_NAME, {prettyPrint: true})
                ),
            }),
            new winston.transports.File({
                filename: join(process.cwd(), 'storage', 'logger', 'combined.log'),
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),
            // other transports...
        ],
        level: LOG_LEVEL,
    }),
};
