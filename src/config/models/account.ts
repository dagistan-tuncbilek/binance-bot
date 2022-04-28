import {Balance} from "./balance";

export interface Account{
    makerCommission: number,
    takerCommission: number,
    buyerCommission: number,
    sellerCommission: number,
    canTrade: boolean,
    canWithdraw: boolean,
    canDeposit: boolean,
    updateTime: number,
    accountType: string,
    balances: Balance[],
    permissions: string[];
}