"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("@utils/prisma"));
class WalletService {
    static RetrieveWallet(userid) {
        return __awaiter(this, void 0, void 0, function* () {
            const UserWallet = yield prisma_1.default.userWallet.findFirst({
                where: {
                    user_id: userid
                },
                select: {
                    balance: true,
                },
            });
            return { wallet: (UserWallet === null || UserWallet === void 0 ? void 0 : UserWallet.balance) || 0, status: true };
        });
    }
    // Add Bank
    static AddBank(body, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const { accountName, accountNumber, bankCode, otherDetails } = body;
            console.log(otherDetails);
            try {
                return yield prisma_1.default.$transaction((t) => __awaiter(this, void 0, void 0, function* () {
                    const checkBanks = yield t.userBanks.findFirst({
                        where: {
                            account_number: accountNumber,
                        }
                    });
                    if (checkBanks) {
                        return {
                            error: true,
                            status: false,
                            message: "Bank account already exists"
                        };
                    }
                    const bank = yield t.userBanks.create({
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
                }));
            }
            catch (error) {
                return {
                    error: true,
                    status: false,
                    message: error.message
                };
            }
        });
    }
    // Get My Banks
    static GetBanks(user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const banks = yield prisma_1.default.userBanks.findMany({
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
            }
            catch (error) {
                return {
                    status: false,
                    message: error.message,
                    data: []
                };
            }
        });
    }
    // Delete Bank
    static DeleteBank(body, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const { accountNumber } = body;
            try {
                const bank = yield prisma_1.default.userBanks.delete({
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
            }
            catch (error) {
                return {
                    status: false,
                    message: error.message
                };
            }
        });
    }
    //     GetTransactions
    static GetTransactions(user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const transactions = yield prisma_1.default.userPointsPurchase.findMany({
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
            }
            catch (error) {
                return {
                    status: "error",
                    error: true,
                    data: [],
                    message: error.message
                };
            }
        });
    }
    //Other Transaction
    static OtherTransactions(user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const transactions = yield prisma_1.default.userTransaction.findMany({
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
            }
            catch (error) {
                return {
                    error: true,
                    data: [],
                    status: "error",
                    message: error.message
                };
            }
        });
    }
}
exports.default = WalletService;
