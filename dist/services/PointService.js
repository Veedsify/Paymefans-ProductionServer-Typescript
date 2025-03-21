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
const GenerateUniqueId_1 = require("@utils/GenerateUniqueId");
const RedisStore_1 = __importDefault(require("@libs/RedisStore"));
class PointService {
    static RetrievePoints(userid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const UserPoints = yield prisma_1.default.userPoints.findFirst({
                    where: {
                        user_id: userid
                    },
                    select: {
                        points: true,
                    },
                });
                return { points: (UserPoints === null || UserPoints === void 0 ? void 0 : UserPoints.points) || 0, status: true };
            }
            catch (err) {
                console.log(err.message);
                throw new Error(err.message);
            }
        });
    }
    // Buy points
    static BuyPoints(user, points_buy_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const point = yield prisma_1.default.globalPointsBuy.findFirst({
                    where: { points_buy_id },
                });
                prisma_1.default.$disconnect();
                if (!point) {
                    return { message: "Sorry you cant buy this package", status: false };
                }
                const createNewPointsOrder = yield this.PaystackPayment(point, user);
                prisma_1.default.$disconnect();
                return createNewPointsOrder;
            }
            catch (err) {
                console.log(err.message);
                throw new Error(err.message);
            }
        });
    }
    // Paystack payment
    static PaystackPayment(point, user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const referenceId = `PNT${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
                const priceOfPoints = point.amount * 1.02;
                yield prisma_1.default.userPointsPurchase.create({
                    data: {
                        purchase_id: referenceId,
                        user_id: user.id,
                        points: point.points,
                        amount: priceOfPoints,
                        success: false,
                    },
                });
                prisma_1.default.$disconnect();
                const CreateOrder = yield fetch("https://api.paystack.co/transaction/initialize", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    },
                    body: JSON.stringify({
                        amount: priceOfPoints * 100,
                        email: user.email,
                        reference: referenceId,
                        callback_url: process.env.SERVER_ORIGINAL_URL + "/api/points/callback",
                    }),
                });
                const data = yield CreateOrder.json();
                return Object.assign({}, data);
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
    }
    // Conversion rate
    static GetConversionRate(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Find either user's conversion rate or global conversion rate, avoiding multiple queries
                const conversionRate = yield prisma_1.default.pointConversionRate.findFirst({
                    where: {
                        OR: [
                            {
                                pointConversionRateUsers: {
                                    some: {
                                        user_id: userId
                                    }
                                }
                            },
                            {
                                pointConversionRateUsers: {
                                    none: {}
                                }
                            }
                        ]
                    }
                });
                // If a conversion rate is found, use it. If not, fall back to a default rate.
                if (conversionRate) {
                    return {
                        error: false,
                        rate: conversionRate.points,
                        message: 'Rate Retrieved Successfully',
                    };
                }
                // If no conversion rate found, fall back to the default rate from the environment
                const rate = Number(process.env.PRICE_PER_POINT);
                return {
                    error: false,
                    rate: rate,
                    message: 'Rate Retrieved Successfully',
                };
            }
            catch (err) {
                console.log(err.message);
                throw new Error(err.message);
            }
        });
    }
    // Purchase points
    static PurchasePoints(user, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!user) {
                    return {
                        error: true,
                        status: false,
                        message: "User not found"
                    };
                }
                if (!amount) {
                    return {
                        error: true,
                        status: false,
                        message: "Amount is required"
                    };
                }
                const rate = yield this.GetConversionRate(user.id);
                if (rate.error == true) {
                    return {
                        status: false,
                        error: true,
                        message: rate.message
                    };
                }
                const platformFee = Number(process.env.PLATFORM_FEE) * Number(amount);
                const points = ((Number(amount) - platformFee) / Number(rate === null || rate === void 0 ? void 0 : rate.rate));
                const response = yield this.CreatePaystackPayment({ amount: parseInt(amount), platformFee, rate: Number(rate === null || rate === void 0 ? void 0 : rate.rate), user: user });
                if (!response.data || response.data.authorization_url == "") {
                    return {
                        status: false,
                        error: true,
                        message: `Cannot Generate Proceed With Checkout`
                    };
                }
                return {
                    status: true,
                    error: false,
                    message: "Payment initiated successfully",
                    checkout: response.data,
                    points: points,
                    platformFee: platformFee,
                };
            }
            catch (err) {
                console.log(err.message);
                throw new Error(err.message);
            }
        });
    }
    // Paystack payment 
    static CreatePaystackPayment(_a) {
        return __awaiter(this, arguments, void 0, function* ({ amount, platformFee, rate, user }) {
            try {
                const referenceId = `PNT${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
                yield prisma_1.default.userPointsPurchase.create({
                    data: {
                        purchase_id: referenceId,
                        user_id: user.id,
                        points: Number((amount - platformFee) / rate),
                        amount: amount,
                        success: false,
                    },
                });
                prisma_1.default.$disconnect();
                const CreateOrder = yield fetch("https://api.paystack.co/transaction/initialize", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    },
                    body: JSON.stringify({
                        amount: amount * 100,
                        email: user.email,
                        reference: referenceId,
                        callback_url: process.env.SERVER_ORIGINAL_URL + "/api/points/callback",
                    }),
                });
                const data = yield CreateOrder.json();
                return data;
            }
            catch (error) {
                console.log(error);
            }
        });
    }
    // Payment callback
    static PaystackPaymentCallBack(_a) {
        return __awaiter(this, arguments, void 0, function* ({ reference }) {
            try {
                if (!reference) {
                    return { status: false, message: "Reference not found" };
                }
                // Verify Payment status in a single query
                const purchase = yield prisma_1.default.userPointsPurchase.findFirst({
                    where: { purchase_id: reference },
                });
                if (!purchase) {
                    return { status: false, message: "Purchase record not found" };
                }
                if (purchase.success) {
                    return { status: false, message: "These points are already updated" };
                }
                // Verify Payment on Paystack
                const verificationResult = yield this.verifyPayment(reference);
                if (!verificationResult || !verificationResult.status) {
                    return { status: false, message: "Payment verification failed" };
                }
                // Use a transaction to ensure data consistency
                return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    // Update purchase record
                    yield tx.userPointsPurchase.update({
                        where: { purchase_id: reference },
                        data: { success: true },
                    });
                    // Add points to user's balance
                    yield tx.userPoints.update({
                        where: { user_id: purchase.user_id },
                        data: {
                            points: {
                                increment: purchase.points,
                            },
                        },
                    });
                    // Create notification
                    const notification_id = `NOT${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
                    yield tx.notifications.create({
                        data: {
                            notification_id,
                            message: `Your Paypoints Purchase was successful, <strong>${purchase.points}</strong> points have been added to your balance.`,
                            user_id: purchase.user_id,
                            action: "purchase",
                            url: "/wallet"
                        }
                    });
                    return { status: true, message: "Payment verified successfully" };
                }));
            }
            catch (err) {
                console.error("Payment verification error:", err);
                return { status: false, message: "An error occurred during payment verification" };
            }
            finally {
                yield prisma_1.default.$disconnect();
            }
        });
    }
    // Helper function to verify payment
    static verifyPayment(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    },
                });
                if (response.status === 200) {
                    return yield response.json();
                }
                return null;
            }
            catch (error) {
                console.error("Paystack API error:", error);
                return null;
            }
        });
    }
    // Get Global POints
    static GetGlobalPoints() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const allPoints = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const points = yield tx.globalPointsBuy.findMany();
                    return points;
                }));
                return {
                    message: "Points retrieved successfully",
                    allPoints,
                    status: true
                };
            }
            catch (err) {
                console.log(err.message);
                throw new Error(err.message);
            }
        });
    }
    // Price per message
    static PricePerMessage(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const PriceKey = `price_per_message:${userId}`;
                const price = yield RedisStore_1.default.get(PriceKey);
                if (price) {
                    return {
                        message: "Price per message retrieved successfully",
                        price_per_message: Number(price),
                        status: true,
                    };
                }
                else {
                    return {
                        message: "Price per message not found",
                        status: false,
                        price_per_message: 0,
                    };
                }
            }
            catch (error) {
                console.error(error);
                throw new Error(error.message);
            }
        });
    }
}
exports.default = PointService;
