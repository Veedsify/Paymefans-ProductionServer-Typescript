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
}
exports.default = WalletService;
