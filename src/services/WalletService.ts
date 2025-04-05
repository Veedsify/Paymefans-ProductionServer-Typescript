import query from "@utils/prisma";
import type {
    AddBankProps,
    AddBankResponse,
    DeleteBankProp,
    DeleteBankResponse,
    GetBanksResponse, GetTransactionsResponse, OtherTransactionResponse,
    RetrieveWalletResponse
} from "../types/wallet";
import type {AuthUser} from "../types/user";

export default class WalletService {
    static async RetrieveWallet(userid: number): Promise<RetrieveWalletResponse> {
        const UserWallet = await query.userWallet.findFirst({
            where: {
                user_id: userid
            },
            select: {
                balance: true,
            },
        });

        return {wallet: UserWallet?.balance || 0, status: true}
    }

    // Add Bank
    static async AddBank(body: AddBankProps, user: AuthUser): Promise<AddBankResponse> {
        const {accountName, accountNumber, bankCode, otherDetails} = body;
        console.log(otherDetails)
        try {
            return await query.$transaction(async (t) => {
                const checkBanks = await t.userBanks.findFirst({
                    where: {
                        account_number: accountNumber,
                    }
                })

                if (checkBanks) {
                    return {
                        error: true,
                        status: false,
                        message: "Bank account already exists"
                    };
                }

                const bank = await t.userBanks.create({
                    data: {
                        user_id: user.id,
                        bank_id: bankCode,
                        bank_name: otherDetails.name,
                        account_name: accountName,
                        account_number: accountNumber,
                        bank_country: otherDetails.country,
                    }
                });

                return {
                    error: true,
                    status: true,
                    message: "Bank added successfully",
                    data: bank
                };
            })

        } catch (error: any) {
            return {
                error: true,
                status: false,
                message: error.message
            };
        }
    }

    // Get My Banks
    static async GetBanks(user: AuthUser): Promise<GetBanksResponse> {
        try {
            const banks = await query.userBanks.findMany({
                where: {
                    user_id: user.id
                }
            });
            return {
                error: false,
                status: true,
                message: "Bank Account Retrieved successfully",
                data: banks
            };
        } catch (error: any) {
            return {
                status: false,
                message: error.message,
                data: []
            };
        }
    }

    // Delete Bank
    static async DeleteBank(body: DeleteBankProp, user: AuthUser): Promise<DeleteBankResponse> {
        const {accountNumber} = body;
        try {
            const bank = await query.userBanks.delete({
                where: {
                    account_number: accountNumber,
                    user_id: user.id
                }
            });
            return {
                status: true,
                message: "Bank deleted successfully",
                data: bank
            };
        } catch (error: any) {
            return {
                status: false,
                message: error.message
            };
        }
    }

//     GetTransactions
    static async GetTransactions(user: AuthUser): Promise<GetTransactionsResponse> {
        try {
            const transactions = await query.userPointsPurchase.findMany({
                where: {
                    user_id: user.id
                },
                orderBy: {
                    created_at: "desc"
                }
            });

            return {
                status: "success",
                error: false,
                message: `Point Purchase Transactions Retrieved`,
                data: transactions
            };
        } catch (error: any) {
            return {
                status: "error",
                error: true,
                data: [],
                message: error.message
            };
        }
    }

    //Other Transaction
    static async OtherTransactions(user: AuthUser): Promise<OtherTransactionResponse> {

        try {
            const transactions = await query.userTransaction.findMany({
                where: {
                    user_id: user.id
                },
                orderBy: {
                    created_at: "desc"
                }
            });

            return {
                message: `Transactions Retrieved`,
                status: "success",
                data: transactions,
                error: false
            };
        } catch (error: any) {
            return {
                error: true,
                data: [],
                status: "error",
                message: error.message
            };
        }
    }
}
