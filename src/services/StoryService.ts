import { getDuration } from "@libs/GetVideoDuration";
import { UploadImageToS3 } from "@libs/UploadImageToS3";
import UploadVideoToS3 from "@libs/UploadVideoToS3";
import { UserStory } from "@prisma/client";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import {
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
              gte: new Date(
                new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000
              ),
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
          }, {})
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
              new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000
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
        }, {})
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
          orderBy: {
            created_at: "desc",
          },
        });

        if (media.length > validLimit) {
          hasMore = true;
          media.pop();
        }

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
      const lengthArray = await Promise.all(
        stories.map(async (story) => {
          if (story.media_type === "video") {
            return await getDuration(story.media_url);
          } else {
            return 5000;
          }
        })
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
                media_id: `MED${GenerateUniqueId()}`,
                media_type: story.media_type,
                filename: story.media_url,
                url: story.media_url,
                duration:
                  story.media_type === "image"
                    ? Number(5000)
                    : Number(lengthArray[index]),
                story_content: story.caption,
                captionStyle: story.captionStyle,
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
  }: UploadStoryProps): Promise<UploadStoryResponse> {
    try {
      const fileUploads = files.map(async (file) => {
        const s3Key = `stories/videos/${file.filename}`;
        if (file.mimetype.includes("video")) {
          await UploadVideoToS3(file, s3Key, "test");
          return {
            filename: `${process.env.AWS_CLOUDFRONT_URL}/${s3Key}`,
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
              onUploadComplete: async (url) => {
                resolve({
                  filename: url,
                  mimetype: file.mimetype,
                });
              },
            });
          }
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
}
