import {IsString} from "class-validator";

export class RemoveCoinDto{
    @IsString()
    asset: string;
}