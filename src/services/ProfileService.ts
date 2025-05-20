import type { Request } from "express";
import type {
    BannerChangeResponse,
    ProfileDataItem,
    ProfileServiceResponse,
    ProfileStatsProps,
    ProfileStatsResponse,
    ProfileUpdateInfo,
    ProfileUpdateResponse,
} from "../types/profile";
import query from "@utils/prisma";
import { UploadImageToS3 } from "@libs/UploadImageToS3";
import type { UploadOptions } from "@libs/UploadImageToS3";
import { UpdateAvatarQueue } from "@jobs/comments/UpdateCommentsAvatar";
import { redis } from "@libs/RedisStore";
import { AuthUser } from "types/user";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
class ProfileService {
    // Get Profile
    static async Profile(username: string, authUserId: number): Promise<ProfileServiceResponse> {
        try {
            const cacheKey = `user_profile_${username}`;
            const cachedUser = await redis.get(cacheKey);
            if (!username) {
                return { message: "User not found", status: false, user: undefined };
            }
            if (cachedUser) {
                return { message: "User found", status: true, user: JSON.parse(cachedUser) };
            }
            const user_name = username.replace(/%40/g, "@");
            const user = await query.user.findFirst({
                where: {
                    username: user_name,
                },
                select: {
                    id: true,
                    username: true,
                    name: true,
                    fullname: true,
                    user_id: true,
                    admin: true,
                    role: true,
                    is_active: true,
                    is_verified: true,
                    website: true,
                    country: true,
                    location: true,
                    city: true,
                    zip: true,
                    active_status: true,
                    post_watermark: true,
                    total_followers: true,
                    total_following: true,
                    total_subscribers: true,
                    email: true,
                    profile_image: true,
                    profile_banner: true,
                    bio: true,
                    Subscribers: {
                        select: {
                            subscriber_id: true,
                        },
                    },
                },
            });
            if (!user) {
                return { message: "User not found", status: false };
            }
            // Check if the user is following the requested user
            const [iFollowThem, theyFollowMe] = await Promise.all([
                query.follow.findFirst({
                    where: { follower_id: authUserId, user_id: user.id },
                }),
                query.follow.findFirst({
                    where: { user_id: authUserId, follower_id: user.id },
                }),
            ]);
            // Cache the user data for 1 minutes
            const response = {
                message: "User found",
                status: true,
                user: {
                    ...user,
                    isFollowing: !!iFollowThem,
                    followsYou: !!theyFollowMe,
                }
            };
            await redis.set(cacheKey, JSON.stringify(response), "EX", 60);
            return response
        } catch (error: any) {
            throw new Error(error.message)
        }
    }
    // Change Banner
    static async BannerChange(req: Request): Promise<BannerChangeResponse> {
        const { user } = req;
        const file = req.file; // Use Multer's file object
        let url = "";
        async function SaveBannerToDb(BannerUrl: string) {
            url = BannerUrl;
            await query.user.update({
                where: {
                    id: user?.id,
                },
                data: {
                    profile_banner: BannerUrl,
                },
            });
        }
        const options: UploadOptions = {
            file: file!,
            folder: "banners",
            contentType: "image/jpeg",
            resize: { width: 1950, height: 650, fit: "cover", position: "center" },
            deleteLocal: true,
            saveToDb: true,
            onUploadComplete: (BannerUrl: string) => SaveBannerToDb(BannerUrl),
            format: "webp",
            quality: 75,
        };
        await UploadImageToS3(options);
        return { message: "Banner updated", status: true, url };
    }
    static async ProfileUpdate(req: Request): Promise<ProfileUpdateResponse> {
        const { user } = req;
        const file = req.file; // Use Multer's file object
        let url = "";
        if (!file) {
            await this.ProfileUpdateInfo(req.body, user?.user_id!);
            return { message: "Profile updated", status: true, url: "" };
        }
        const SaveAvatarToDb = async (AvatarUrl: string) => {
            url = AvatarUrl;
            await query.user.update({
                where: {
                    id: user?.id,
                },
                data: {
                    profile_image: AvatarUrl,
                },
            });
            // Update comments avatar
            await UpdateAvatarQueue.add("UpdateAvatarQueue", { userId: user?.user_id, avatarUrl: AvatarUrl }, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            })
            await ProfileService.ProfileUpdateInfo(req.body, user?.user_id!);
        };
        const options: UploadOptions = {
            file: file!,
            folder: "avatars",
            contentType: "image/jpeg",
            resize: { width: 200, height: 200, fit: "cover", position: "center" },
            deleteLocal: true,
            saveToDb: true,
            onUploadComplete: (AvatarUrl: string) => SaveAvatarToDb(AvatarUrl),
            format: "webp",
            quality: 100,
        };
        await UploadImageToS3(options);
        return { message: "Avatar updated", status: true, url };
    }
    // Update Profile Info
    static async ProfileUpdateInfo(
        { name, location, bio, website, username }: ProfileUpdateInfo,
        userId: string
    ) {
        try {
            const updateUser = await query.user.update({
                where: {
                    user_id: userId,
                },
                data: {
                    name: name,
                    location: location,
                    bio: bio,
                    username: username,
                    website: website,
                },
            });
            query.$disconnect();
            return !!updateUser;
        } catch (err) {
            console.log(err);
            return false;
        }
    }
    static async getProfileQueryArgs({
        type,
        user,
        limit,
        cursor: pageCursor,
        searchQuery,
    }: {
        type: ProfileStatsProps["type"];
        user: AuthUser;
        limit: number;
        cursor?: string | number | null;
        searchQuery?: string;
        // Adjust query type and include as per your Prisma schema
    }) {
        let model: any;
        let where: any = {};
        let include: any = undefined;
        let cursor = pageCursor === 1 ? null : pageCursor;
        switch (type) {
            case "followers":
                model = query.follow;
                where.user_id = user.id;
                where.id = cursor ? { lt: cursor } : undefined;
                include = {
                    followers: {
                        select: {
                            profile_image: true,
                            profile_banner: true,
                            id: true,
                            username: true,
                            name: true,
                        }
                    }
                };
                if (searchQuery) {
                    where.OR = [
                        { followers: { username: { contains: searchQuery, mode: "insensitive" } } },
                        { followers: { name: { contains: searchQuery, mode: "insensitive" } } },
                    ];
                }
                break;
            case "following":
                model = query.follow;
                where.follower_id = user.id;
                where.id = cursor ? { lt: cursor } : undefined;
                include = {
                    users: {
                        select: {
                            profile_image: true,
                            profile_banner: true,
                            id: true,
                            username: true,
                            name: true,
                        }
                    },
                };
                if (searchQuery) {
                    where.OR = [
                        { users: { username: { contains: searchQuery, mode: "insensitive" } } },
                        { users: { name: { contains: searchQuery, mode: "insensitive" } } },
                    ];
                }
                break;
            case "subscribers":
                model = query.subscribers;
                where.user_id = user.id;
                where.id = cursor ? { lt: cursor } : undefined;
                include = {
                    subscriber: {
                        select: {
                            profile_image: true,
                            profile_banner: true,
                            id: true,
                            username: true,
                            name: true,
                        }
                    }
                };
                if (searchQuery) {
                    where.OR = [
                        { user: { username: { contains: searchQuery, mode: "insensitive" } } },
                        { user: { name: { contains: searchQuery, mode: "insensitive" } } },
                        { subscriber: { name: { contains: searchQuery, mode: "insensitive" } } },
                    ];
                }
                break;
            default:
                throw new Error("Invalid type");
        }
        return {
            model,
            queryArgs: {
                where,
                take: limit + 1,
                orderBy: { created_at: "desc" },
                ...(cursor && { skip: 1 }),
                ...(include && { include }),
            },
        };
    }
    // Profile Stats
    static async ProfileStats({
        user,
        type,
        limit = 25,
        cursor,
        query: searchQuery,
    }: ProfileStatsProps): Promise<ProfileStatsResponse> {
        const count = type === "followers"
            ? user?.total_followers : type === "following"
                ? user?.total_following : user?.total_subscribers;
        if (!user?.id) {
            return {
                error: true,
                message: "Invalid user",
                data: [],
                total: count,
                hasMore: false,
                nextCursor: 0,
            };
        }
        // Compose a unique cache key (watch out for JSON.stringify issues if needed)
        const cacheKey = `profilestats:${type}:${user.id}:${searchQuery || ""}:${cursor || ""}:${limit}`;
        try {
            // Get from Redis(returns string | null)
            const cachedRaw = await redis.get(cacheKey);
            if (cachedRaw) {
                const cached: ProfileStatsResponse = JSON.parse(cachedRaw);
                return cached;
            }
            // Build and run the query (type safe)
            const { model, queryArgs } = await this.getProfileQueryArgs({
                type,
                user,
                limit,
                cursor,
                searchQuery,
            });
            const data: ProfileDataItem[] = await model.findMany(queryArgs);
            if (!data || (searchQuery && data.length === 0)) {
                return {
                    error: false,
                    message: "No data found",
                    data: [],
                    total: count,
                    hasMore: false,
                    nextCursor: 0,
                };
            }
            const hasMore = data.length > limit;
            const cursorId = hasMore ? data.pop()!.id : null;
            // Extract all relevant user IDs from the result
            const otherUserIds = data.map(item =>
                type === "followers"
                    ? item.followers.id
                    : type === "following"
                        ? item.users.id
                        : item.subscriber.id
            );
            // Query follow relationships where current user follows these users
            const followingRelations = await query.follow.findMany({
                where: {
                    follower_id: user.id,
                    user_id: { in: otherUserIds },
                },
                select: { user_id: true },
            });
            // Build a Set of followed user IDs for quick lookup
            const followingSet = new Set(followingRelations.map(f => f.user_id));
            // Add is_following to each user
            const enrichedData = data.map(item => {
                const targetUser =
                    type === "followers"
                        ? item.followers
                        : type === "following"
                            ? item.users
                            : item.subscriber;
                return {
                    ...targetUser,
                    is_following: followingSet.has(targetUser.id),
                };
            });
            const result: ProfileStatsResponse = {
                error: false,
                message: "Data fetched successfully",
                data: enrichedData,
                hasMore,
                total: count,
                nextCursor: cursorId,
            };
            // Cache for 60 seconds (EX = expiry in seconds)
            await redis.set(cacheKey, JSON.stringify(result), "EX", 60);
            return result;
        } catch (error: any) {
            console.error("Error fetching profile stats:", error);
            throw new Error("Error fetching profile stats");
        }
    }
    // Follow/Unfollow User
    static async FollowUnfollowUser(
        authUserId: number,
        inputAction: "follow" | "unfollow",
        userId: number,
    ): Promise<{ message: string; status: boolean }> {
        try {
            const action = inputAction.toLowerCase() as "follow" | "unfollow";
            const pastTense = action === "follow" ? "followed" : "unfollowed";
            if (authUserId === userId) {
                return { message: `You cannot ${action} yourself`, status: false };
            }
            const user = await query.user.findFirst({
                where: {
                    id: userId,
                },
            });
            if (!user) {
                return { message: "User not found", status: false };
            }
            const updates = {
                follow: {
                    create: {
                        data: {
                            user_id: userId,
                            follow_id: `FOL${GenerateUniqueId()}`,
                            follower_id: authUserId,
                        },
                    },
                    delete: {
                        where: {
                            user_id: userId,
                            follower_id: authUserId,
                        },
                    },
                },
                user: {
                    increment: {
                        follower: { total_followers: { increment: 1 } },
                        following: { total_following: { increment: 1 } },
                    },
                    decrement: {
                        follower: { total_followers: { decrement: 1 } },
                        following: { total_following: { decrement: 1 } },
                    },
                },
            };
            const isFollow = action === "follow";
            const operation = isFollow ? "increment" : "decrement";
            await query.$transaction([
                isFollow
                    ? query.follow.create(updates.follow.create)
                    : query.follow.deleteMany(updates.follow.delete),
                query.user.update({
                    where: { id: userId },
                    data: updates.user[operation].follower,
                }),
                query.user.update({
                    where: { id: authUserId },
                    data: updates.user[operation].following,
                }),
            ]);
            try {
                const stream = redis.scanStream({
                    match: `profilestats:*:${authUserId}*`,
                    count: 100,
                });
                const keysToDelete: string[] = [];
                for await (const keys of stream) {
                    keysToDelete.push(...keys);
                }
                if (keysToDelete.length) {
                    await redis.del(...keysToDelete);
                }
            } catch (error) {
                console.error('Error deleting cache keys:', error);
            }
            return { message: `You have ${pastTense} the user`, status: true };
        } catch (error) {
            console.error("Error following/unfollowing user:", error);
            throw new Error("Error following/unfollowing user");
        }
    }
}
export default ProfileService;
