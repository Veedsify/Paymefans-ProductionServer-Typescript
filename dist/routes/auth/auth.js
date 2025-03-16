"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuthController_1 = __importDefault(require("@controllers/AuthController"));
const auth_1 = __importDefault(require("@middleware/auth"));
const auth = express_1.default.Router();
// Authentication
auth.post("/signup", AuthController_1.default.Register);
auth.post("/signup/username", AuthController_1.default.Username);
auth.post("/login", AuthController_1.default.Login);
auth.post("/points", auth_1.default, AuthController_1.default.Points);
auth.post("/wallet", auth_1.default, AuthController_1.default.Wallet);
auth.get("/retrieve", auth_1.default, AuthController_1.default.Retrieve);
exports.default = auth;
