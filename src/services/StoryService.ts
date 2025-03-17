import { UserStory } from "@prisma/client";
import query from "@utils/prisma";
import { GetStoriesResponse } from "types/story";

export default class StoryService {
      static async GetStories({ userId }: { userId: number }): Promise<GetStoriesResponse> {
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
                              message: "User not found"
                        }
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
                                          gte: new Date(new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000),
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
                              randomStories.reduce<Record<number, { user: any; stories: UserStory[]; storyCount: number }>>((acc, story) => {
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
                                    gte: new Date(new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000),
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
                                          role: true
                                    },
                              },
                              StoryMedia: true,
                        },
                        orderBy: { created_at: "asc" },
                  });

                  // Step 5: Group stories by user
                  const groupedStories = Object.values(
                        stories.reduce<Record<number, { user: any; stories: UserStory[]; storyCount: number }>>((acc, story) => {
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
}
