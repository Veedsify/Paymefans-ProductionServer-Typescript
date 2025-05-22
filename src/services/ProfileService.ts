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
import { UserNotificationQueue } from "@jobs/notifications/UserNotificaton";
import getSingleName from "@utils/GetSingleName";
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
                return JSON.parse(cachedUser);
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
                    created_at: true,
                    Settings: {
                        select: {
                            telegram_url: true,
                            facebook_url: true,
                            instagram_url: true,
                            twitter_url: true,
                            tiktok_url: true,
                            youtube_url: true,
                            snapchat_url: true,
                        }
                    },
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
            await redis.set(cacheKey, JSON.stringify(response), "EX", 30);
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

        // Check if user exists
        if (!user?.id) {
            return { message: "User not authenticated", status: false, url: "" };
        }

        try {
            // Handle profile update without file
            if (!file) {
                const updateProfile = await this.ProfileUpdateInfo(req.body, user);
                return {
                    message: updateProfile.error ? updateProfile.message : "Profile updated",
                    status: !updateProfile.error,
                    url: ""
                };
            }

            let AvatarUrl = "";

            const options: UploadOptions = {
                file: file,
                folder: "avatars",
                contentType: "image/jpeg",
                resize: { width: 200, height: 200, fit: "cover", position: "center" },
                deleteLocal: true,
                saveToDb: true,
                onUploadComplete: (url: string) => {
                    AvatarUrl = url;
                },
                format: "webp",
                quality: 100,
            };

            // Upload image to S3
            await UploadImageToS3(options);

            // Check if AvatarUrl was set by callback
            if (!AvatarUrl) {
                return { message: "Failed to upload image", status: false, url: "" };
            }

            // Update profile info
            const updateProfile = await this.ProfileUpdateInfo(req.body, user);
            if (updateProfile.error) {
                return { message: updateProfile.message, status: false, url: "" };
            }

            // Update user profile image in database
            await query.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    profile_image: AvatarUrl || "",
                },
            });

            // Add to queue for updating comments avatar
            await UpdateAvatarQueue.add("UpdateAvatarQueue", {
                userId: user.user_id,
                avatarUrl: AvatarUrl
            }, {
                attempts: 3,
                backoff: { type: 'fixed', delay: 5000 },
                removeOnComplete: true,
            });

            return { message: "Avatar updated", status: true, url: AvatarUrl };
        } catch (error) {
            console.error("Profile update error:", error);
            return { message: "Failed to update profile", status: false, url: "" };
        }
    }
    // Update Profile Info
    static async ProfileUpdateInfo(
        { name, location, bio, website, username: bodyUsername, instagram, twitter, facebook, tiktok, youtube, snapchat, telegram }: ProfileUpdateInfo,
        user: AuthUser
    ): Promise<{ error: boolean; message: string }> {
        let username = bodyUsername?.trim();
        if (!username) {
            username = user.username
        }
        // Validate inputs
        if (!user.id || isNaN(user.id)) {
            return { error: true, message: "Invalid user ID" };
        }

        if (!username || username.trim().length < 3) {
            return { error: true, message: "Username must be at least 3 characters long" };
        }

        // Validate social media URLs (basic check)
        const socialMediaFields = { instagram, twitter, facebook, tiktok, youtube, snapchat, telegram };
        for (const [platform, url] of Object.entries(socialMediaFields)) {
            if (url && !this.isValidUrl(url)) {
                return { error: true, message: `Invalid ${platform} URL` };
            }
        }

        try {
            // Check for username uniqueness
            const existingUser = await query.user.findFirst({
                where: {
                    username: {
                        equals: username,
                        mode: 'insensitive', // Case-insensitive username check
                    },
                    NOT: {
                        id: user.id,
                    },
                },
            });

            if (existingUser) {
                return { error: true, message: "Username already exists" };
            }

            // Update user and settings in a transaction for consistency
            // Build user update data with only provided fields
            const userUpdateData: any = {};
            if (name !== undefined) userUpdateData.name = name?.trim() || "";
            if (location !== undefined) userUpdateData.location = location?.trim() || null;
            if (bio !== undefined) userUpdateData.bio = bio?.trim() || null;
            if (username !== undefined) userUpdateData.username = username.trim();
            if (website !== undefined) userUpdateData.website = website?.trim() || null;

            // Build settings update data with only provided fields
            const settingsUpdateData: any = {};
            if (instagram !== undefined) settingsUpdateData.instagram_url = instagram?.trim() || null;
            if (twitter !== undefined) settingsUpdateData.twitter_url = twitter?.trim() || null;
            if (facebook !== undefined) settingsUpdateData.facebook_url = facebook?.trim() || null;
            if (tiktok !== undefined) settingsUpdateData.tiktok_url = tiktok?.trim() || null;
            if (youtube !== undefined) settingsUpdateData.youtube_url = youtube?.trim() || null;
            if (snapchat !== undefined) settingsUpdateData.snapchat_url = snapchat?.trim() || null;
            if (telegram !== undefined) settingsUpdateData.telegram_url = telegram?.trim() || null;

            // Only update if there are fields to update
            const queries = [];
            if (Object.keys(userUpdateData).length > 0) {
                queries.push(
                    query.user.update({
                        where: { id: user.id },
                        data: userUpdateData,
                    })
                );
            }
            if (Object.keys(settingsUpdateData).length > 0) {
                queries.push(
                    query.settings.update({
                        where: { id: user.id },
                        data: settingsUpdateData,
                    })
                );
            }
            if (queries.length > 0) {
                await query.$transaction(queries);
            }

            return { error: false, message: "Profile updated successfully" };
        } catch (error: any) {
            console.error("ProfileUpdateInfo error:", error);
            return { error: true, message: `Error updating profile: ${error.message || 'Unknown error'}` };
        }
    }

    // Helper function to validate URLs
    static isValidUrl(url: string | undefined): boolean {
        if (!url) return true; // Allow empty URLs
        try {
            new URL(url);
            return true;
        } catch {
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
        const authUser = await query.user.findFirst({
            where: {
                id: user.id,
            },
            select: {
                id: true,
                total_followers: true,
                total_following: true,
                total_subscribers: true,
            },
        });

        if (!authUser) {
            return {
                error: true,
                message: "Invalid user",
                data: [],
                total: 0,
                hasMore: false,
                nextCursor: 0,
            };
        }

        const count = type === "followers"
            ? authUser?.total_followers
            : type === "following"
                ? authUser?.total_following
                : authUser?.total_subscribers;

        console.log(user?.total_followers, user?.total_following, user?.total_subscribers);

        if (!user?.id) {
            return {
                error: true,
                message: "Invalid user",
                data: [],
                total: count || 0,
                hasMore: false,
                nextCursor: 0,
            };
        }
        // Compose a unique cache key (watch out for JSON.stringify issues if needed)

        try {
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
                    total: count || 0,
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
                total: count || 0,
                nextCursor: cursorId,
            };
            // Cache for 60 seconds (EX = expiry in seconds)
            return result;
        } catch (error: any) {
            console.error("Error fetching profile stats:", error);
            throw new Error("Error fetching profile stats");
        }
    }
    // Follow/Unfollow User
    static async FollowUnfollowUser(
        authUser: AuthUser,
        inputAction: "follow" | "unfollow",
        userId: number,
    ): Promise<{ message: string; status: boolean }> {
        try {
            const action = inputAction.toLowerCase() as "follow" | "unfollow";
            const pastTense = action === "follow" ? "followed" : "unfollowed";

            if (authUser.id === userId) {
                return { message: `You cannot ${action} yourself`, status: false };
            }

            // Ensure the user exists
            const user = await query.user.findFirst({ where: { id: userId } });
            if (!user) {
                return { message: "User not found", status: false };
            }

            // Prepare DB operations
            if (action === "follow") {
                // Check if already following
                const existing = await query.follow.findFirst({
                    where: { user_id: userId, follower_id: authUser.id }
                });
                if (existing) {
                    await UserNotificationQueue.add("new-follow-notification", {
                        user_id: userId,
                        url: `/${authUser?.username}`,
                        message: `Hi ${getSingleName(user.name)}, <strong><a href="/${authUser?.username}">${authUser?.username}</a> </strong> has just followed you`,
                        action: "follow",
                        notification_id: `NTF${GenerateUniqueId()}`,
                        read: false,
                    })
                    return { message: "Already following this user", status: false };
                }

                await query.$transaction([
                    query.follow.create({
                        data: {
                            user_id: userId,
                            follow_id: `FOL${GenerateUniqueId()}`,
                            follower_id: authUser.id,
                        }
                    }),
                    query.user.update({
                        where: { id: userId },
                        data: { total_followers: { increment: 1 } }
                    }),
                    query.user.update({
                        where: { id: authUser.id },
                        data: { total_following: { increment: 1 } }
                    }),
                ]);
                await UserNotificationQueue.add("new-follow-notification", {
                    user_id: userId,
                    url: `/${authUser?.username}`,
                    message: `Hi ${getSingleName(user.name)}, <strong><a href="/${authUser?.username}">${authUser?.username}</a> </strong> has just followed you`,
                    action: "follow",
                    notification_id: `NTF${GenerateUniqueId()}`,
                    read: false,
                })
            } else {
                // "unfollow"
                const unfollowResult = await query.follow.deleteMany({
                    where: { user_id: userId, follower_id: authUser.id }
                });

                if (!unfollowResult.count) {
                    return { message: "You are not following this user", status: false };
                }

                await query.$transaction([
                    query.user.update({
                        where: { id: userId },
                        data: { total_followers: { decrement: 1 } }
                    }),
                    query.user.update({
                        where: { id: authUser.id },
                        data: { total_following: { decrement: 1 } }
                    })
                ]);
            }

            // Clear relevant Redis cache
            try {
                const stream = redis.scanStream({
                    match: `profilestats:*:${authUser.id}*`,
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
            return { message: "Error following/unfollowing user", status: false };
        }
    }
}
export default ProfileService;
