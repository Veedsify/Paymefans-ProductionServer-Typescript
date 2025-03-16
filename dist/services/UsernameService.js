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
class UsernameService {
    static CheckUsername(_a) {
        return __awaiter(this, arguments, void 0, function* ({ username }) {
            try {
                // Check if username exists
                const usernameExists = yield this.findUserName(username);
                if (!usernameExists.status) {
                    return { status: false, message: "Username already exists" };
                }
                return { status: true, message: "Username available" };
            }
            catch (error) {
                return { status: false, message: "Internal server error" };
            }
        });
    }
    static findUserName(username) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma_1.default.user.findFirst({
                where: {
                    username: username,
                }
            });
            if (user) {
                return { message: "Username already exists", status: false };
            }
            return { message: "Username available", status: true };
        });
    }
    ;
}
exports.default = UsernameService;
