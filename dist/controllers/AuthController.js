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
const RegisterService_1 = __importDefault(require("@services/RegisterService"));
const UsernameService_1 = __importDefault(require("@services/UsernameService"));
const LoginService_1 = __importDefault(require("@services/LoginService"));
const PointService_1 = __importDefault(require("@services/PointService"));
const WalletService_1 = __importDefault(require("@services/WalletService"));
const UserService_1 = __importDefault(require("@services/UserService"));
class AuthController {
    // Register Service
    static Register(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const CreateAccount = yield RegisterService_1.default.RegisterNewUser(req.body);
                if (CreateAccount.error) {
                    console.log(CreateAccount.message);
                    return res.status(201).json({ message: CreateAccount.message, status: false });
                }
                return res.status(201).json({ message: "Account created successfully", status: true });
            }
            catch (error) {
                return res.status(500).json({ message: "Internal server error", status: false });
            }
        });
    }
    //  Username Checker
    static Username(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const CheckForUsername = yield UsernameService_1.default.CheckUsername({
                username: req.body.username
            });
            if (!CheckForUsername.status) {
                return res.status(400).json({ message: CheckForUsername.message, status: false });
            }
            return res.status(200).json({ message: CheckForUsername.message, status: true });
        });
    }
    // Login Service
    static Login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const LoginAccount = yield LoginService_1.default.LoginUser(req.body);
                if (LoginAccount.error) {
                    console.log(LoginAccount.message);
                    return res.status(400).json({ message: LoginAccount.message, status: false });
                }
                return res.status(200).json({ message: "Login successful", status: true, token: LoginAccount.token, user: LoginAccount.user });
            }
            catch (error) {
                return res.status(500).json({ message: "Internal server error", status: false });
            }
        });
    }
    // Points
    static Points(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const points = yield PointService_1.default.RetrievePoints((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id);
                return res.status(200).json({ points: points.points, status: true });
            }
            catch (error) {
                return res.status(500).json({ message: "Internal server error", status: false });
            }
        });
    }
    // Retrieve Wallet
    static Wallet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const UserWallet = yield WalletService_1.default.RetrieveWallet((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id);
                return res.status(200).json({ balance: UserWallet.wallet, status: true });
            }
            catch (error) {
                return res.status(500).json({ message: "Internal server error", status: false });
            }
        });
    }
    // Retrieve User
    static Retrieve(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield UserService_1.default.RetrieveUser((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id);
            return res.status(200).json(user);
        });
    }
}
exports.default = AuthController;
