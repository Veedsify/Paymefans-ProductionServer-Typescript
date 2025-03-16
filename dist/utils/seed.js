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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const HashPassword_1 = require("../libs/HashPassword");
const { SERVER_ORIGINAL_URL } = process.env;
const prisma = new client_1.PrismaClient();
const uniqueUserId = Math.random().toString(36).substring(2, 15);
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const password = yield (0, HashPassword_1.CreateHashedPassword)("password");
        yield prisma.user.upsert({
            where: { email: 'admin@paymefans.com' },
            update: {},
            create: {
                email: 'admin@paymefans.com',
                fullname: "Paymefans",
                name: "Paymefans",
                password,
                admin: true,
                phone: "1234567890",
                location: "Nigeria",
                role: "admin",
                profile_image: SERVER_ORIGINAL_URL + "/site/avatar.png",
                user_id: uniqueUserId,
                username: "@paymefans",
                UserWallet: {
                    create: {
                        wallet_id: uniqueUserId,
                        balance: 0,
                    }
                },
                UserPoints: {
                    create: {
                        conversion_rate: 0,
                        points: 0,
                    }
                },
                Settings: {
                    create: {
                        price_per_message: 0,
                        enable_free_message: true,
                        subscription_price: 0,
                        subscription_duration: "1 Month",
                        subscription_type: "free"
                    }
                }
            },
        });
    });
}
main()
    .catch(e => {
    throw e;
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
