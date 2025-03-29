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
const StoryService_1 = __importDefault(require("@services/StoryService"));
class StoryController {
    //Get Stories from the database
    static GetStories(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const stories = yield StoryService_1.default.GetStories({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
                res.status(200).json(Object.assign({}, stories));
            }
            catch (error) {
                console.log(error);
                res.status(500).json({
                    message: "An error occurred while fetching stories",
                    error: error.message,
                    status: false,
                });
            }
        });
    }
    // Get My Media
    static GetMyMedia(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const options = {
                    page: req.query.page,
                    limit: req.query.limit,
                    user: req.user,
                };
                const media = yield StoryService_1.default.GetMyMedia(options);
                if (media.error) {
                    return res.status(400).json(media);
                }
                res.status(200).json(Object.assign({}, media));
            }
            catch (error) {
                console.log(error);
                res.status(500).json({
                    message: "An error occurred while fetching stories",
                    error: error.message,
                    status: false,
                });
            }
        });
    }
    // Save Story
    static SaveStory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.body);
                const options = {
                    stories: req.body.stories,
                    user: req.user,
                };
                const media = yield StoryService_1.default.SaveStory(options);
                if (media.error) {
                    return res.status(400).json(media);
                }
                res.status(200).json(Object.assign({}, media));
            }
            catch (error) {
                console.log(error);
                res.status(500).json({
                    message: "An error occurred while saving stories",
                    error: error.message,
                    status: false,
                });
            }
        });
    }
    // Upload Story
    static UploadStory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const storyUpload = yield StoryService_1.default.UploadStory({
                    files: req.files,
                });
                if (storyUpload.error) {
                    return res.status(400).json(storyUpload);
                }
                res.status(200).json(Object.assign({}, storyUpload));
            }
            catch (error) {
                console.log(error);
                res.status(500).json({
                    message: "An error occurred while uploading stories",
                    error: error.message,
                    status: false,
                });
            }
        });
    }
}
exports.default = StoryController;
