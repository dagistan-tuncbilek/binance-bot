import {IsString} from "class-validator";

export class CreateCoinDto{

    @IsString()
    asset: string;

    @IsString()
    symbol: string;
}