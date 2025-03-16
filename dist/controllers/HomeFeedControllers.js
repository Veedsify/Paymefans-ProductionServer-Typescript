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
const HomeFeedService_1 = __importDefault(require("@services/HomeFeedService"));
const feedService = new HomeFeedService_1.default();
class HomeFeedController {
    static GetHomePosts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const page = parseInt(req.query.page) || 1;
                const result = yield feedService.getHomeFeed((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id, page);
                res.json(result);
            }
            catch (error) {
                console.error('Feed error:', error);
                res.status(500).json({ error: 'Error fetching feed' });
            }
        });
    }
    GetUserPersonalPosts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const targetUserId = parseInt(req.params.userId);
                const page = parseInt(req.query.page) || 1;
                const result = yield feedService.getUserPosts(Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id), targetUserId, page);
                res.json(result);
            }
            catch (error) {
                console.error('User posts error:', error);
                res.status(500).json({ error: 'Error fetching user posts' });
            }
        });
    }
}
exports.default = HomeFeedController;
