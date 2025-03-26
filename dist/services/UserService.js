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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("@utils/prisma"));
class UserService {
    static RetrieveUser(userid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const user = yield tx.user.findUnique({
                        where: {
                            id: userid
                        },
                        include: {
                            UserPoints: true,
                            UserWallet: true,
                            Settings: true,
                            Model: true,
                            _count: {
                                select: {
                                    Follow: {
                                        where: {
                                            user_id: userid
                                        }
                                    },
                                    Subscribers: {
                                        where: {
                                            user_id: userid
                                        }
                                    }
                                },
                            }
                        }
                    });
                    if (!user) {
                        return { message: "User not found", status: false };
                    }
                    const following = yield tx.user.count({
                        where: {
                            Follow: {
                                some: {
                                    follower_id: userid
                                }
                            }
                        }
                    });
                    const getMySubscriptions = yield tx.subscribers.findMany({
                        where: {
                            subscriber_id: userid
                        },
                        select: {
                            user_id: true
                        }
                    });
                    const { password } = user, rest = __rest(user, ["password"]);
                    const subscriptions = getMySubscriptions.map(sub => sub.user_id);
                    const purchasedPosts = [2];
                    return {
                        user: Object.assign(Object.assign({}, rest), { following, subscriptions, purchasedPosts }),
                        status: true
                    };
                }));
                return result;
            }
            catch (error) {
                console.log(error);
                return { message: "Internal server error", status: false };
            }
        });
    }
}
exports.default = UserService;
