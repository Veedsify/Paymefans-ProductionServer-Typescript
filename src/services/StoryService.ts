import { redis } from "@libs/RedisStore";
import type { UserStory } from "@prisma/client";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import type {
    GetStoriesResponse,
    GetStoryMediaProps,
    GetStoryMediaResponse,
    SaveStoryProps,
    SaveStoryResponse,
} from "types/story";
import { v4 as uuid } from "uuid";

export default class StoryService {
    // Get Stories from the database
    static async GetStories({
        userId,
    }: {
        userId: number;
    }): Promise<GetStoriesResponse> {
        try {
            // Step 1: Get user's followers
            const user = await query.user.findUnique({
                where: { id: userId },
                include: { Follow: true, Subscribers: true },
            });

            if (!user) {
                return {
                    status: false,
                    data: null,
                    message: "User not found",
                };
            }

            const subscribers = user.Subscribers; // subscribers of the user
            const following = user.Follow; // Users the user is following
            let userIdsToFetch = [];

            // Step 2: Check following count
            if (following.length > 15) {
                userIdsToFetch = following
                    .slice(0, 30)
                    .map((u) => u.follower_id);
            } else {
                userIdsToFetch = [
                    ...following.map((u) => u.follower_id),
                    ...subscribers.map((u) => u.subscriber_id),
                ];
                // Remove duplicates and ensure we have up to 15 users
                userIdsToFetch = Array.from(new Set(userIdsToFetch)).slice(
                    0,
                    15,
                );
            }

            userIdsToFetch.unshift(userId);

            // Step 3: Fallback for no following
            if (userIdsToFetch.length >= 1) {
                const randomStories = await query.userStory.findMany({
                    where: {
                        created_at: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                        },
                    },
                    take: 15,
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                profile_image: true,
                                bio: true,
                                name: true,
                                LiveStream: true,
                                Follow: true,
                                Subscribers: true,
                                role: true,
                            },
                        },
                        StoryMedia: true,
                    },
                    orderBy: { created_at: "asc" },
                });

                // Group randomStories by user
                const groupedRandomStories = Object.values(
                    randomStories.reduce<
                        Record<
                            number,
                            {
                                user: any;
                                stories: UserStory[];
                                storyCount: number;
                            }
                        >
                    >((acc, story) => {
                        const userId = story.user.id;
                        if (!acc[userId]) {
                            acc[userId] = {
                                user: story.user,
                                stories: [],
                                storyCount: 0,
                            };
                        }
                        acc[userId].stories.push(story);
                        acc[userId].storyCount += 1;
                        return acc;
                    }, {}),
                );

                return {
                    status: true,
                    message: "User stories fetched successfully",
                    data: groupedRandomStories,
                };
            }

            // Step 4: Get stories from the selected users
            const stories = await query.userStory.findMany({
                where: {
                    user_id: { in: userIdsToFetch },
                    created_at: {
                        gte: new Date(
                            new Date().setHours(0, 0, 0, 0) -
                                24 * 60 * 60 * 1000,
                        ),
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            profile_image: true,
                            bio: true,
                            name: true,
                            LiveStream: true,
                            Follow: true,
                            Subscribers: true,
                            role: true,
                        },
                    },
                    StoryMedia: true,
                },
                orderBy: { created_at: "asc" },
            });

            // Step 5: Group stories by user
            const groupedStories = Object.values(
                stories.reduce<
                    Record<
                        number,
                        { user: any; stories: UserStory[]; storyCount: number }
                    >
                >((acc, story) => {
                    const userId = story.user.id;
                    if (!acc[userId]) {
                        acc[userId] = {
                            user: story.user,
                            stories: [],
                            storyCount: 0,
                        };
                    }
                    acc[userId].stories.push(story);
                    acc[userId].storyCount += 1;
                    return acc;
                }, {}),
            );

            return {
                status: true,
                message: "User stories fetched successfully",
                data: groupedStories,
            };
        } catch (error) {
            console.error(error);
            throw new Error("An error occurred while fetching user stories");
        }
    }

    // Get User Stories - Fetch stories for a specific user
    static async GetUserStories({
        username,
        viewerId,
    }: {
        username: string;
        viewerId: number;
    }): Promise<{
        error: boolean;
        message: string;
        data?: any;
    }> {
        try {
            // Find the user by username or ID
            const targetUser = await query.user.findFirst({
                where: {
                    OR: [
                        { username: username },
                        {
                            id: isNaN(Number(username))
                                ? undefined
                                : Number(username),
                        },
                    ],
                },
                select: {
                    id: true,
                    username: true,
                    profile_image: true,
                    name: true,
                    bio: true,
                },
            });

            if (!targetUser) {
                return {
                    error: true,
                    message: "User not found",
                };
            }

            // Check if viewer is blocked by the target user
            const isBlocked = await query.userBlock.findFirst({
                where: {
                    blocker_id: targetUser.id,
                    blocked_id: viewerId,
                },
            });

            if (isBlocked) {
                return {
                    error: true,
                    message: "You are blocked by this user",
                };
            }

            // Get stories from the user (within last 24 hours)
            const stories = await query.userStory.findMany({
                where: {
                    user_id: targetUser.id,
                    created_at: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            profile_image: true,
                            bio: true,
                            name: true,
                            role: true,
                        },
                    },
                    StoryMedia: {
                        orderBy: {
                            created_at: "asc",
                        },
                    },
                },
                orderBy: { created_at: "asc" },
            });

            if (stories.length === 0) {
                return {
                    error: false,
                    message: "No stories found for this user",
                    data: {
                        user: targetUser,
                        stories: [],
                        storyCount: 0,
                    },
                };
            }

            return {
                error: false,
                message: "User stories fetched successfully",
                data: {
                    user: targetUser,
                    stories: stories,
                    storyCount: stories.length,
                },
            };
        } catch (error) {
            console.error(error);
            throw new Error("An error occurred while fetching user stories");
        }
    }

    // Get My Media
    static async GetMyMedia({
        page,
        limit,
        user,
    }: GetStoryMediaProps): Promise<GetStoryMediaResponse> {
        try {
            // Parse limit and page parameters
            const parsedLimit = limit ? parseInt(String(limit), 10) : 6;
            const validLimit =
                Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
            const parsedPage = page ? parseInt(String(page), 10) : 1;
            const validPage =
                Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
            let hasMore = false;
            return await query.$transaction(async (prisma) => {
                const postCount = await prisma.post.findMany({
                    where: { user_id: user.id },
                });
                const postIds = postCount.map((post) => post.id);
                const mediaCount = await prisma.userMedia.count({
                    where: {
                        post_id: { in: postIds },
                    },
                });

                const media = await prisma.userMedia.findMany({
                    where: {
                        post_id: { in: postIds },
                        media_type: "image",
                    },
                    skip: (validPage - 1) * validLimit,
                    take: validLimit + 1,
                    include: {
                        post: {
                            select: {
                                watermark_enabled: true,
                            },
                        },
                    },
                    orderBy: {
                        created_at: "desc",
                    },
                });

                if (media.length > validLimit) {
                    hasMore = true;
                    media.pop();
                }

                // const mediaWithSignedUrls = await Promise.all(
                //   media.map(async (m) => {
                //     return {
                //       ...m,
                //       url:
                //         m.media_type === "video"
                //           ? await GenerateCloudflareSignedUrl(
                //             m.media_id,
                //             m.media_type,
                //             m.url,
                //           )
                //           : m.url,
                //     };
                //   }),
                // );

                return {
                    status: true,
                    error: false,
                    message: "Media retrieved successfully",
                    data: media,
                    hasMore: hasMore,
                    total: mediaCount,
                };
            });
        } catch (error: any) {
            console.log(error);
            throw new Error(error);
        }
    }
    // Save Story
    static async SaveStory({
        stories,
        user,
    }: SaveStoryProps): Promise<SaveStoryResponse> {
        try {
            // Save stories
            const story_id = `STR${GenerateUniqueId()}`;
            // Build media payload ensuring unique media_ids
            const storyMediaPayload = await Promise.all(
                stories.map(async (story) => {
                    let mediaId = story.media_id;
                    // Check if a StoryMedia already exists with this media_id
                    const existing = await query.storyMedia.findUnique({
                        where: { media_id: mediaId },
                    });

                    if (existing) {
                        mediaId = uuid();
                    }

                    return {
                        media_id: mediaId,
                        media_type: story.media_type,
                        filename: story.media_url,
                        media_url: story.media_url,
                        media_state: story.media_state || "completed",
                        duration: story.duration
                            ? Number(story?.duration * 1000)
                            : 5000,
                        story_content: story.caption,
                        captionElements: JSON.stringify(story.captionElements),
                    };
                }),
            );

            const story = await query.userStory.create({
                data: {
                    user_id: user.id,
                    story_id,
                    StoryMedia: {
                        create: storyMediaPayload,
                    },
                },
                include: {
                    StoryMedia: true,
                },
            });

            return {
                error: false,
                data: story,
            };
        } catch (error) {
            console.log(error);
            throw new Error("An error occurred while saving stories");
        }
    }
    // Upload Story
    // static async UploadStory({
    //   files,
    //   user,
    // }: UploadStoryProps): Promise<UploadStoryResponse> {
    //   // This method is deprecated. Upload is now handled directly in the controller with multer-s3.
    //   throw new Error("UploadStory method is deprecated");
    // }

    // View Story
    static async ViewStory({
        storyMediaId,
        viewerId,
    }: {
        storyMediaId: string;
        viewerId: number;
    }): Promise<{ error: boolean; message: string; data?: any }> {
        try {
            // Check if story media exists
            const storyMedia = await query.storyMedia.findUnique({
                where: { media_id: storyMediaId },
                include: {
                    story: {
                        include: { user: true },
                    },
                },
            });

            if (!storyMedia) {
                return {
                    error: true,
                    message: "Story not found",
                };
            }

            // Don't record view if user is viewing their own story
            if (storyMedia.story.user_id === viewerId) {
                return {
                    error: false,
                    message: "Own story view not recorded",
                };
            }

            // Check if view already exists
            const existingView = await query.storyView.findFirst({
                where: {
                    story_media_id: storyMediaId,
                    viewer_id: viewerId,
                },
            });

            if (existingView) {
                return {
                    error: false,
                    message: "Story view already recorded",
                    data: existingView,
                };
            }

            if (!viewerId || !storyMediaId) {
                return {
                    error: false,
                    message: "Story view already recorded",
                };
            }

            // Create new view record
            const newView = await query.storyView.create({
                data: {
                    story_media_id: storyMediaId,
                    viewer_id: viewerId,
                },
                include: {
                    viewer: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            profile_image: true,
                        },
                    },
                },
            });

            return {
                error: false,
                message: "Story view recorded successfully",
                data: newView,
            };
        } catch (error) {
            console.error(error);
            throw new Error("An error occurred while recording story view");
        }
    }

    // Get Story Views for a specific media
    static async GetStoryViews({
        storyMediaId,
        userId,
        cursor,
    }: {
        storyMediaId: string;
        cursor?: number;
        userId: number;
    }): Promise<{
        error: boolean;
        message: string;
        data?: any;
        nextCursor?: number;
    }> {
        try {
            // Check if story media exists and belongs to the user
            const storyMedia = await query.storyMedia.findUnique({
                where: { media_id: storyMediaId },
                include: {
                    story: {
                        include: { user: true },
                    },
                },
            });

            if (!storyMedia) {
                return {
                    error: true,
                    message: "Story not found",
                };
            }

            // Only allow story owner to view the views
            if (storyMedia.story.user_id !== userId) {
                return {
                    error: true,
                    message: "You can only view your own story views",
                };
            }

            // Get all views for this story media
            const views = await query.storyView.findMany({
                where: {
                    ...(cursor && { id: { lt: cursor } }),
                    story_media_id: storyMediaId,
                },
                include: {
                    viewer: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            profile_image: true,
                        },
                    },
                },
                take: 20,
                orderBy: { id: "desc" },
            });

            const viewCount = views.length;
            const nextCursor =
                views.length === 20 ? views[views.length - 1].id : undefined;

            console.log("nextCursor", nextCursor);

            return {
                error: false,
                message: "Story views fetched successfully",
                nextCursor,
                data: {
                    views,
                    viewCount,
                    storyMediaId,
                },
            };
        } catch (error) {
            console.error(error);
            throw new Error("An error occurred while fetching story views");
        }
    }

    // Get Story Mentions
    static async GetStoryMentions({ storyMediaId }: { storyMediaId: string }) {
        try {
            const cacheKey = `story_mentions_${storyMediaId}`;
            const storyMentions = await redis.get(cacheKey);
            if (storyMentions) {
                return JSON.parse(storyMentions);
            }
            // First verify the user owns the story or has permission to view mentions
            const storyMedia = await query.storyMedia.findUnique({
                where: { media_id: storyMediaId },
                include: {
                    story: {
                        include: {
                            user: true,
                        },
                    },
                },
            });

            if (!storyMedia) {
                return {
                    error: true,
                    message: "Story not found",
                };
            }

            const mentions = await query.storyMention.findMany({
                where: { story_media_id: storyMediaId },
                include: {
                    mentioned_user: {
                        select: {
                            id: true,
                            user_id: true,
                            username: true,
                            name: true,
                            profile_image: true,
                        },
                    },
                },
                orderBy: { created_at: "desc" },
            });

            const response = {
                error: false,
                message: "Story mentions fetched successfully",
                data: {
                    mentions,
                    storyMediaId,
                },
            };

            redis.set(cacheKey, JSON.stringify(response), "EX", 3600);
            return response;
        } catch (error) {
            console.error(error);
            throw new Error("An error occurred while fetching story mentions");
        }
    }

    // Add Story Mentions
    static async AddStoryMentions({
        storyMediaId,
        mentionedUserIds,
        mentionerId,
    }: {
        storyMediaId: string;
        mentionedUserIds: number[];
        mentionerId: number;
    }) {
        try {
            // First verify the story exists and belongs to the mentioner
            const storyMedia = await query.storyMedia.findUnique({
                where: { media_id: storyMediaId },
                include: {
                    story: {
                        include: {
                            user: true,
                        },
                    },
                },
            });

            if (!storyMedia) {
                return {
                    error: true,
                    message: "Story not found",
                };
            }

            if (storyMedia.story.user.id !== mentionerId) {
                return {
                    error: true,
                    message:
                        "You don't have permission to add mentions to this story",
                };
            }

            // Remove duplicates and filter out invalid user IDs
            const uniqueUserIds = [...new Set(mentionedUserIds)];

            // Verify all mentioned users exist
            const validUsers = await query.user.findMany({
                where: {
                    id: {
                        in: uniqueUserIds,
                    },
                },
                select: {
                    id: true,
                    username: true,
                },
            });

            if (validUsers.length !== uniqueUserIds.length) {
                return {
                    error: true,
                    message: "Some mentioned users were not found",
                };
            }

            // Create mentions (use createMany with skipDuplicates to handle existing mentions)
            await query.storyMention.createMany({
                data: uniqueUserIds.map((userId) => ({
                    story_media_id: storyMediaId,
                    mentioned_user_id: userId,
                    mentioner_id: mentionerId,
                })),
                skipDuplicates: true,
            });

            // Send notifications to mentioned users
            const { MentionService } = await import("./MentionService");
            await MentionService.SendStoryMentionNotifications({
                storyMediaId,
                mentionedUserIds: uniqueUserIds,
                mentionerId,
            });

            return {
                error: false,
                message: "Story mentions added successfully",
                data: {
                    storyMediaId,
                    mentionedUserIds: uniqueUserIds,
                },
            };
        } catch (error) {
            console.error(error);
            throw new Error("An error occurred while adding story mentions");
        }
    }

    // Delete Story
    static async DeleteStory({
        storyMediaId,
        userId,
    }: {
        storyMediaId: string;
        userId: number;
    }) {
        try {
            // Check if story media exists and belongs to the user
            const storyMedia = await query.storyMedia.findUnique({
                where: { media_id: storyMediaId },
                include: {
                    story: {
                        include: { user: true },
                    },
                },
            });

            if (!storyMedia) {
                return {
                    error: true,
                    message: "Story not found",
                };
            }

            // Only allow story owner to delete
            if (storyMedia.story.user_id !== userId) {
                return {
                    error: true,
                    message: "You can only delete your own stories",
                };
            }

            // Save user_story_id before deleting
            const storyId = storyMedia.story.id;

            // Delete story media (this will cascade delete views and mentions)
            await query.storyMedia.delete({
                where: { media_id: storyMediaId },
            });

            // Check if story has any other media, if not, delete the story
            const remainingMedia = await query.storyMedia.count({
                where: { user_story_id: storyId },
            });

            if (remainingMedia === 0) {
                await query.userStory.delete({
                    where: { id: storyId },
                });
            }

            return {
                error: false,
                message: "Story deleted successfully",
            };
        } catch (error) {
            console.error(error);
            throw new Error("An error occurred while deleting the story");
        }
    }
}
