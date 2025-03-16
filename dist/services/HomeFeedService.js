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
class FeedService {
    calculateEngagementScore(post) {
        const totalInteractions = post.post_likes + post.post_comments + post.post_reposts;
        return ((post.post_likes * 1 + post.post_comments * 1.5 + post.post_reposts * 2) /
            (totalInteractions || 1));
    }
    calculateRecencyScore(postDate) {
        const ageInHours = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
        return Math.exp(-FeedService.TIME_DECAY_FACTOR * ageInHours);
    }
    calculateRelevanceScore(post, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [userInteractions, followsCreator, isSubscribed] = yield Promise.all([
                prisma_1.default.postLike.findMany({
                    where: { user_id: userId },
                    include: { post: true },
                }),
                prisma_1.default.follow.findFirst({
                    where: { user_id: post.user_id, follower_id: userId },
                }),
                prisma_1.default.subscribers.findFirst({
                    where: { user_id: post.user_id, subscriber_id: userId },
                }),
            ]);
            let relevanceScore = 0;
            if (followsCreator)
                relevanceScore += 0.3;
            if (isSubscribed)
                relevanceScore += 0.5;
            const similarContentInteraction = userInteractions.filter((interaction) => interaction.post.user_id === post.user_id).length;
            relevanceScore += Math.min(similarContentInteraction * 0.1, 0.2);
            return Math.min(relevanceScore, 1);
        });
    }
    getHomeFeed(userId, page) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = (page - 1) * FeedService.POSTS_PER_HOME_PAGE;
            const posts = yield prisma_1.default.post.findMany({
                where: {
                    post_is_visible: true,
                    post_status: "approved",
                    OR: [
                        { post_audience: "public" },
                        {
                            AND: [
                                { post_audience: "followers" },
                                { user: { Follow: { some: { follower_id: userId } } } },
                            ],
                        },
                        {
                            AND: [
                                { post_audience: "subscribers" },
                                { user: { Subscribers: { some: { subscriber_id: userId } } } },
                            ],
                        },
                    ],
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            fullname: true,
                            user_id: true,
                            username: true,
                            profile_image: true,
                            profile_banner: true,
                            bio: true,
                            Subscribers: { select: { subscriber_id: true, created_at: true } },
                            total_followers: true,
                        },
                    },
                    UserMedia: true,
                    PostLike: true,
                    UserRepost: true,
                },
                skip,
                take: FeedService.POSTS_PER_HOME_PAGE,
                orderBy: { created_at: "desc" },
            });
            const scoredPosts = yield Promise.all(posts.map((post) => __awaiter(this, void 0, void 0, function* () {
                const engagementScore = this.calculateEngagementScore(post);
                const recencyScore = this.calculateRecencyScore(post.created_at);
                const relevanceScore = yield this.calculateRelevanceScore(post, userId);
                const totalScore = engagementScore * FeedService.ENGAGEMENT_WEIGHT +
                    recencyScore * FeedService.RECENCY_WEIGHT +
                    relevanceScore * FeedService.RELEVANCE_WEIGHT;
                return Object.assign(Object.assign({}, post), { score: totalScore });
            })));
            return {
                posts: scoredPosts.sort((a, b) => b.score - a.score),
                page,
                hasMore: scoredPosts.length === FeedService.POSTS_PER_HOME_PAGE,
            };
        });
    }
    getUserPosts(viewerId, targetUserId, page) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = (page - 1) * FeedService.POSTS_PER_HOME_PAGE;
            const [isFollowing, isSubscribed] = yield Promise.all([
                prisma_1.default.follow.findFirst({
                    where: { user_id: targetUserId, follower_id: viewerId },
                }),
                prisma_1.default.subscribers.findFirst({
                    where: { user_id: targetUserId, subscriber_id: viewerId },
                }),
            ]);
            const posts = yield prisma_1.default.post.findMany({
                where: {
                    user_id: targetUserId,
                    post_is_visible: true,
                    OR: [
                        { post_audience: "public" },
                        {
                            AND: [
                                { post_audience: "followers" },
                                { user_id: isFollowing ? targetUserId : -1 },
                            ],
                        },
                        {
                            AND: [
                                { post_audience: "subscribers" },
                                { user_id: isSubscribed ? targetUserId : -1 },
                            ],
                        },
                    ],
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            password: true,
                            fullname: true,
                            user_id: true,
                            username: true,
                            profile_image: true,
                            profile_banner: true,
                            bio: true,
                            total_followers: true,
                        },
                    },
                    UserMedia: true,
                    PostLike: true,
                    UserRepost: true,
                },
                orderBy: { created_at: "desc" },
                skip,
                take: FeedService.POSTS_PER_HOME_PAGE,
            });
            return {
                posts,
                page,
                hasMore: posts.length === FeedService.POSTS_PER_HOME_PAGE,
            };
        });
    }
}
FeedService.POSTS_PER_HOME_PAGE = Number(process.env.POSTS_PER_HOME_PAGE) || 10;
FeedService.ENGAGEMENT_WEIGHT = 0.4;
FeedService.RECENCY_WEIGHT = 0.3;
FeedService.RELEVANCE_WEIGHT = 0.3;
FeedService.TIME_DECAY_FACTOR = 0.1;
exports.default = FeedService;
