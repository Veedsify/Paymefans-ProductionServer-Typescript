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
const PostService_1 = __importDefault(require("@services/PostService"));
class PostController {
    // Create Post
    static CreatePost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const SavePost = yield PostService_1.default.CreatePost(Object.assign({ user: req.user }, req.body));
                if ('error' in SavePost && SavePost.error) {
                    return res.status(400).json({ message: SavePost.error });
                }
                res.status(201).json(SavePost);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // My Posts
    static GetMyPosts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const MyPosts = yield PostService_1.default.GetMyPosts({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, page: req.query.page, limit: req.query.limit });
                return res.status(200).json({ status: true, message: 'Post Retreived Successfully', data: MyPosts.data, total: MyPosts.total });
            }
            catch (err) {
                console.error(err.message);
                res.status(500).json({ status: false, message: 'Internal Server Error!' });
            }
        });
    }
    // My Reposts
    static GetMyReposts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const MyReposts = yield PostService_1.default.MyReposts({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, page: req.query.page, limit: req.query.limit });
                return res.status(200).json({ status: true, message: 'Reposts Retreived Successfully', data: MyReposts.data, total: MyReposts.total });
            }
            catch (err) {
                console.error(err.message);
                res.status(500).json({ status: false, message: 'Internal Server Error!' });
            }
        });
    }
    // Get Reposts
    static GetReposts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const Reposts = yield PostService_1.default.Reposts({ userId: req.params.userId, page: req.query.page, limit: req.query.limit });
                return res.status(200).json({ status: true, message: 'Reposts Retreived Successfully', data: Reposts.data, total: Reposts.total });
            }
            catch (err) {
                console.error(err.message);
                res.status(500).json({ status: false, message: 'Internal Server Error!' });
            }
        });
    }
    // Get Media
    static GetMedia(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const Media = yield PostService_1.default.GetMedia({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, page: req.query.page, limit: req.query.limit });
                return res.status(200).json({ status: true, message: 'Media Retreived Successfully', data: Media.data, total: Media.total });
            }
            catch (err) {
                console.error(err.message);
                res.status(500).json({ status: false, message: 'Internal Server Error!' });
            }
        });
    }
    //Get Other Media
    static GetOtherMedia(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const Media = yield PostService_1.default.GetOtherMedia({ userId: req.params.userId, page: req.query.page, limit: req.query.limit });
                return res.status(200).json({ status: true, message: 'Media Retreived Successfully', data: Media.data, total: Media.total });
            }
            catch (err) {
                console.error(err.message);
                res.status(500).json({ status: false, message: 'Internal Server Error!' });
            }
        });
    }
    // Get User Post By User ID
    static GetUserPostByID(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const UserPost = yield PostService_1.default.GetUserPostByID({ userId: req.params.userId, page: req.query.page, limit: req.query.limit });
                return res.status(200).json(Object.assign({}, UserPost));
            }
            catch (err) {
                console.error(err.message);
                res.status(500).json({ status: false, message: 'Internal Server Error!' });
            }
        });
    }
    // Get Post By Post ID
    static GetSinglePost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const SinglePost = yield PostService_1.default.GetSinglePost({ postId: req.params.postId, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
                if (SinglePost.error) {
                    return res.status(400).json(Object.assign({}, SinglePost));
                }
                return res.status(200).json(Object.assign({}, SinglePost));
            }
            catch (err) {
                console.error(err.message);
                res.status(500).json({ status: false, message: 'Internal Server Error!' });
            }
        });
    }
    // Edit Post
    static EditPost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const EditPost = yield PostService_1.default.EditPost(Object.assign({ postId: req.params.postId, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }, req.body));
                return res.status(200).json({ status: true, message: 'Post Updated Successfully', data: EditPost });
            }
            catch (err) {
                console.error(err.message);
                res.status(500).json({ status: false, message: 'Internal Server Error!' });
            }
        });
    }
    // Update Post Audience
    static UpdatePostAudience(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const UpdateAudience = yield PostService_1.default.UpdatePostAudience({ postId: req.params.postId, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, visibility: req.body.visibility });
                return res.status(200).json(Object.assign({}, UpdateAudience));
            }
            catch (error) {
                console.log(error.message);
                res.status(500).json({
                    status: false,
                    message: "Internal Server Error"
                });
            }
        });
    }
    // Create Repost
    static CreateRepost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const Repost = yield PostService_1.default.CreateRepost({ postId: req.params.postId, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
                return res.status(200).json(Object.assign({}, Repost));
            }
            catch (error) {
                console.log(error.message);
                res.status(500).json({
                    status: false,
                    message: "Internal Server Error"
                });
            }
        });
    }
    // Get Post Comments
    static GetPostComments(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const options = {
                    postId: req.params.postId,
                    userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
                    page: req.query.page,
                    limit: req.query.limit
                };
                const Comments = yield PostService_1.default.GetPostComments(options);
                return res.status(200).json(Object.assign({}, Comments));
            }
            catch (error) {
                console.log(error.message);
                res.status(500).json({
                    status: false,
                    message: "Internal Server Error"
                });
            }
        });
    }
    // Like a Post
    static LikePost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const options = { postId: req.params.postId, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id };
                const Like = yield PostService_1.default.LikePost(options);
                return res.status(200).json(Object.assign({}, Like));
            }
            catch (error) {
                console.log(error.message);
                res.status(500).json({
                    status: false,
                    message: "Internal Server Error"
                });
            }
        });
    }
    // Delete Post
    static DeletePost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const options = { postId: req.params.postId, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id };
                const Delete = yield PostService_1.default.DeletePost(options);
                return res.status(200).json(Object.assign({}, Delete));
            }
            catch (error) {
                console.log(error.message);
                res.status(500).json({
                    status: false,
                    message: "Internal Server Error"
                });
            }
        });
    }
}
exports.default = PostController;
