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
const ProfileService_1 = __importDefault(require("@services/ProfileService"));
class ProfileController {
    // Load Profile
    static Profile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const body = req.body;
                const user = yield ProfileService_1.default.Profile(body.username);
                res.json(user);
            }
            catch (error) {
                console.error('Profile error:', error);
                res.status(500).json({ error: 'Error fetching profile' });
            }
        });
    }
    //Banner Change
    static BannerChange(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield ProfileService_1.default.BannerChange(req);
                res.json(user);
            }
            catch (error) {
                console.error('Banner error:', error);
                res.status(500).json({ error: 'Error changing banner' });
            }
        });
    }
    //Avatar Change
    static ProfileUpdate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield ProfileService_1.default.ProfileUpdate(req);
                res.json(user);
            }
            catch (error) {
                console.error('Avatar error:', error);
                res.status(500).json({ error: 'Error changing avatar' });
            }
        });
    }
}
exports.default = ProfileController;
