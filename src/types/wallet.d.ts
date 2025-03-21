import {UserBanks, UserPointsPurchase, UserTransaction} from "@prisma/client";

export type RetrieveWalletResponse = {
    wallet: number;
    status: boolean;
}

export interface AddBankProps {
    accountName: string;
    accountNumber: string;
    bankCode: string;
    otherDetails: {
        name: string;
        country: string;
    };
}

export interface AddBankResponse {
    status: boolean;
    error: boolean;
    message: string;
    data?: UserBanks
}

export type GetBanksResponse = {
    status: boolean;
    error?: boolean;
    message: string;
    data: UserBanks[]
}

export type DeleteBankResponse = {
    status: boolean;
    message: string;
    data?: UserBanks
}
export type DeleteBankProp = {
    accountNumber: string;
}
export interface GetTransactionsResponse {
    error: boolean;
    status: "success"| "error";
    data: UserPointsPurchase[]
    message: string
}

export interface OtherTransactionResponse {
    error: boolean;
    status: "success"| "error";
    data: UserTransaction[]
    message: string
}