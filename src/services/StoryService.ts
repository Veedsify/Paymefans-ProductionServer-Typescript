import GenerateCloudflareSignedUrl from "@libs/GenerateSignedUrls";
import { getDuration } from "@libs/GetVideoDuration";
import { UploadImageToS3 } from "@libs/UploadImageToS3";
import UploadVideoToS3 from "@libs/UploadVideoToS3";
import type { UserStory } from "@prisma/client";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import { config } from "config/config";
import { nanoid } from "nanoid";
import path from "path";
import type {
  GetStoriesResponse,
  GetStoryMediaProps,
  GetStoryMediaResponse,
  SaveStoryProps,
  SaveStoryResponse,
  UploadStoryProps,
  UploadStoryResponse,
} from "types/story";

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
      if (following.length > 30) {
        userIdsToFetch = following.slice(0, 30).map((u) => u.follower_id);
      } else {
        userIdsToFetch = [
          ...following.map((u) => u.follower_id),
          ...subscribers.map((u) => u.subscriber_id),
        ];
        // Remove duplicates and ensure we have up to 15 users
        userIdsToFetch = Array.from(new Set(userIdsToFetch)).slice(0, 30);
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
                fullname: true,
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
              { user: any; stories: UserStory[]; storyCount: number }
            >
          >((acc, story) => {
            const userId = story.user.id;
            if (!acc[userId]) {
              acc[userId] = { user: story.user, stories: [], storyCount: 0 };
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
              new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000,
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
              fullname: true,
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
            acc[userId] = { user: story.user, stories: [], storyCount: 0 };
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

        const mediaWithSignedUrls = await Promise.all(
          media.map(async (m) => {
            return {
              ...m,
              url:
                m.media_type === "video"
                  ? await GenerateCloudflareSignedUrl(
                    m.media_id,
                    m.media_type,
                    m.url,
                  )
                  : m.url,
            };
          }),
        );

        return {
          status: true,
          error: false,
          message: "Media retrieved successfully",
          data: mediaWithSignedUrls,
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
      const lengthArray = await Promise.all(
        stories.map(async (story) => {
          if (story.media_type === "video") {
            return await getDuration(story.media_url);
          } else {
            return 5000;
          }
        }),
      );

      // Save stories
      const story_id = `STR${GenerateUniqueId()}`;
      const story = await query.userStory.create({
        data: {
          user_id: user.id,
          story_id,
          StoryMedia: {
            create: stories.map((story, index) => {
              return {
                media_id:
                  story.media_type === "image"
                    ? `MED${GenerateUniqueId()}`
                    : story.media_id,
                media_type: story.media_type,
                filename: story.media_url,
                media_url: story.media_url,
                duration:
                  story.media_type === "image"
                    ? Number(5000)
                    : Number(lengthArray[index]),
                story_content: story.caption,
                captionElements: JSON.stringify(story.captionElements),
              };
            }),
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
  static async UploadStory({
    files,
    user,
  }: UploadStoryProps): Promise<UploadStoryResponse> {
    try {
      const fileUploads = files.map(async (file) => {
        const filename = nanoid(10)
        const username = user.username.replace("@", "")
        const s3Key = `${username}/${String(filename) + path.extname(file.originalname || file.filename)}`;
        const s3KeyProcessedOutput = `videos/${filename}/${filename}.m3u8`;
        const cloudfrontUrl = `${config.storyCloudfrontUrl}/${s3KeyProcessedOutput}`;
        if (file.mimetype.includes("video")) {
          await UploadVideoToS3(file, s3Key, "test", config.storyVideoBucket);
          console.log("Video uploaded", cloudfrontUrl);
          return {
            filename: cloudfrontUrl,
            mimetype: file.mimetype,
          };
        }
        return await new Promise<{ filename: string; mimetype: string }>(
          async (resolve, _) => {
            return await UploadImageToS3({
              file,
              contentType: file.mimetype,
              folder: "stories",
              format: "webp",
              quality: 100,
              resize: {
                width: 1200,
                fit: "cover",
                position: "center",
                height: null,
              },
              saveToDb: true,
              bucket: config.storyImageBucket,
              onUploadComplete: async (url) => {
                resolve({
                  filename: url,
                  mimetype: file.mimetype,
                });
              },
            });
          },
        );
      });

      const results = await Promise.all(fileUploads);

      const uploadedFiles = results.map((file) => {
        return {
          filename: file.filename,
          mimetype: file.mimetype,
        };
      });

      return {
        error: false,
        data: uploadedFiles,
      };
    } catch (error) {
      console.log(error);
      throw new Error("An error occurred while uploading stories");
    }
  }

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
}
