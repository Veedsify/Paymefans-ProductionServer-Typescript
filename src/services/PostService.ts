import { CreatePostProps, CreatePostResponse, GetMyMediaProps, GetMyMediaResponse, GetMyPostProps, GetMyPostResponse, GetOtherMediaProps, GetOtherMediaResponse, GetSinglePostResponse, GetUserPostByIdProps, GetUserPostByIdResponse, RepostProps } from "../types/post";
import { v4 as uuid } from "uuid";
import query from "@utils/prisma";
import { PostAudience } from "@prisma/client";
import RemoveCloudflareMedia from "@libs/RemoveCloudflareMedia";


export default class PostService {
      // Create Post
      static async CreatePost(data: CreatePostProps): Promise<CreatePostResponse> {
            try {
                  const postId = uuid();
                  const user = data.user
                  const { content, visibility, media, removedMedia } = data;
                  if (removedMedia) {
                        const removeMedia = await RemoveCloudflareMedia(removedMedia)
                        if ('error' in removeMedia && removeMedia.error) {
                              return {
                                    status: false,
                                    message: "An error occurred while deleting media",
                                    error: removeMedia.error,
                              };
                        }
                  }
                  if ((!content || content.trim().length === 0) && !visibility) {
                        return {
                              status: false,
                              error: true,
                              message: "Content and visibility are required",
                        }
                  }

                  // Continue with the rest of your logic
                  const post = await query.post.create({
                        data: {
                              post_id: postId,
                              was_repost: false,
                              content: content ? content : "",
                              post_audience: visibility as PostAudience,
                              post_status: "pending",
                              post_is_visible: true,
                              user_id: user.id,
                              media: [],
                              UserMedia: {
                                    createMany: {
                                          data: media.map((file) => {
                                                if (file && file.id) {
                                                      return {
                                                            media_id: file.id,
                                                            media_type: file.type,
                                                            url: file.public,
                                                            media_state: file.type.includes("image") ? "completed" : "processing",
                                                            blur: file.blur,
                                                            poster: file.public,
                                                            accessible_to: visibility,
                                                            locked: visibility === "subscribers",
                                                      };
                                                } else {
                                                      console.error("Invalid file response:", file);
                                                      return null;
                                                }
                                          }).filter(Boolean) as any[],
                                    },
                              },
                        },
                  });
                  // Save post to database

                  return {
                        status: true,
                        message: "Post created successfully",
                        data: post,
                  }
            } catch (error: any) {
                  throw new Error(error.message);
            }
      }

      // Get Current User Posts
      static async GetMyPosts({ userId, page, limit }: GetMyPostProps): Promise<GetMyPostResponse> {
            try {

                  // Parse limit to an integer or default to 5 if not provided
                  const parsedLimit = limit ? parseInt(limit, 10) : 5;
                  const validLimit =
                        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;

                  // Parse page to an integer or default to 1 if not provided
                  const parsedPage = page ? parseInt(page, 10) : 1;
                  const validPage =
                        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

                  const postCount = await query.post.count({
                        where: {
                              user_id: userId,
                        },
                  });

                  const posts = await query.post.findMany({
                        where: {
                              user_id: userId
                        },
                        select: {
                              id: true,
                              content: true,
                              post_id: true,
                              post_audience: true,
                              media: true,
                              created_at: true,
                              post_likes: true,
                              post_comments: true,
                              post_reposts: true,
                              was_repost: true,
                              repost_id: true,
                              repost_username: true,
                              UserMedia: {
                                    select: {
                                          id: true,
                                          media_id: true,
                                          post_id: true,
                                          duration: true,
                                          media_state: true,
                                          poster: true,
                                          url: true,
                                          blur: true,
                                          media_type: true,
                                          locked: true,
                                          accessible_to: true,
                                          created_at: true,
                                          updated_at: true,
                                    },
                              },
                              PostLike: {
                                    select: {
                                          post_id: true,
                                          user_id: true,
                                    },
                              },
                              user: {
                                    select: {
                                          username: true,
                                          profile_image: true,
                                          name: true,
                                          is_model: true,
                                          user_id: true,
                                          Subscribers: {
                                                select: {
                                                      subscriber_id: true,
                                                },
                                          },
                                    },
                              },
                        },
                        skip: (validPage - 1) * validLimit,
                        take: validLimit,
                        orderBy: {
                              created_at: "desc",
                        },
                  });

                  return {
                        status: true,
                        message: "Posts retrieved successfully",
                        data: posts,
                        total: postCount,
                  }
            } catch (error: any) {
                  console.log(error);
                  throw new Error(error);
            }
      }

      // Get Current User Reposts
      static async MyReposts({ userId, page, limit }: GetMyPostProps): Promise<GetMyPostResponse> {
            try {
                  // Parse limit to an integer or default to 5 if not provided
                  const parsedLimit = limit ? parseInt(limit, 10) : 5;
                  const validLimit =
                        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;

                  // Parse page to an integer or default to 1 if not provided
                  const parsedPage = page ? parseInt(page, 10) : 1;
                  const validPage =
                        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

                  const userRepostCount = await query.userRepost.count({
                        where: {
                              user_id: userId,
                        },
                  });

                  if (userRepostCount === 0) {
                        return {
                              status: false,
                              total: 0,
                              data: [],
                              message: "No reposts found",
                        };
                  }


                  const userReposts = await query.userRepost.findMany({
                        where: {
                              user_id: userId,
                        },
                        select: {
                              post: {
                                    select: {
                                          id: true,
                                          content: true,
                                          post_id: true,
                                          post_audience: true,
                                          media: true,
                                          created_at: true,
                                          post_likes: true,
                                          post_comments: true,
                                          post_reposts: true,
                                          was_repost: true,
                                          repost_id: true,
                                          repost_username: true,
                                          UserMedia: {
                                                select: {
                                                      id: true,
                                                      media_id: true,
                                                      post_id: true,
                                                      poster: true,
                                                      duration: true,
                                                      media_state: true,
                                                      url: true,
                                                      blur: true,
                                                      media_type: true,
                                                      locked: true,
                                                      accessible_to: true,
                                                      created_at: true,
                                                      updated_at: true,
                                                },
                                          },
                                          PostLike: {
                                                select: {
                                                      post_id: true,
                                                      user_id: true,
                                                },
                                          },
                                          user: {
                                                select: {
                                                      username: true,
                                                      profile_image: true,
                                                      name: true,
                                                      user_id: true,
                                                      Subscribers: {
                                                            select: {
                                                                  subscriber_id: true,
                                                            },
                                                      },
                                                },
                                          },
                                    },
                              },
                        },
                        skip: (validPage - 1) * validLimit,
                        take: validLimit,
                        orderBy: {
                              id: "desc",
                        },
                  });

                  const reposts = userReposts.map((repost) => repost.post)
                  return {
                        status: true,
                        message: "Reposts retrieved successfully",
                        data: reposts,
                        total: userRepostCount,
                  };

            } catch (error: any) {
                  console.log(error);
                  throw new Error(error.message);
            }
      }

      // Get Reposts
      static async Reposts({ userId, page, limit }: RepostProps): Promise<GetMyPostResponse> {
            try {
                  // Parse limit to an integer or default to 5 if not provided
                  const parsedLimit = limit ? parseInt(limit, 10) : 5;
                  const validLimit =
                        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;

                  // Parse page to an integer or default to 1 if not provided
                  const parsedPage = page ? parseInt(page, 10) : 1;
                  const validPage =
                        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

                  const userRepostCount = await query.userRepost.count({
                        where: {
                              user_id: Number(userId),
                        },
                  });

                  if (userRepostCount === 0) {
                        return {
                              status: true,
                              message: "Reposts retrieved successfully",
                              data: [],
                              total: 0,
                        };
                  }

                  const userReposts = await query.userRepost.findMany({
                        where: {
                              user_id: Number(userId),
                        },
                        select: {
                              post: {
                                    select: {
                                          id: true,
                                          content: true,
                                          post_id: true,
                                          post_audience: true,
                                          media: true,
                                          created_at: true,
                                          post_likes: true,
                                          post_comments: true,
                                          post_reposts: true,
                                          was_repost: true,
                                          repost_id: true,
                                          repost_username: true,
                                          UserMedia: {
                                                select: {
                                                      id: true,
                                                      media_id: true,
                                                      post_id: true,
                                                      media_state: true,
                                                      poster: true,
                                                      duration: true,
                                                      url: true,
                                                      blur: true,
                                                      media_type: true,
                                                      locked: true,
                                                      accessible_to: true,
                                                      created_at: true,
                                                      updated_at: true,
                                                },
                                          },
                                          PostLike: {
                                                select: {
                                                      post_id: true,
                                                      user_id: true,
                                                },
                                          },
                                          user: {
                                                select: {
                                                      username: true,
                                                      profile_image: true,
                                                      name: true,
                                                      user_id: true,
                                                      Subscribers: {
                                                            select: {
                                                                  subscriber_id: true,
                                                            },
                                                      },
                                                },
                                          },
                                    },
                              },
                        },
                        skip: (validPage - 1) * validLimit,
                        take: validLimit,
                        orderBy: {
                              id: "desc",
                        },
                  });

                  const reposts = userReposts.map((repost) => repost.post)

                  return {
                        status: true,
                        message: "Reposts retrieved successfully",
                        data: reposts,
                        total: userRepostCount,
                  };
            } catch (error: any) {
                  console.log(error);
                  throw new Error(error.message);
            }
      }

      // Get My Media
      static async GetMedia({ userId, page, limit }: GetMyMediaProps): Promise<GetMyMediaResponse> {
            try {
                  // Parse limit to an integer or default to 5 if not provided
                  const parsedLimit = limit ? parseInt(limit, 10) : 6;
                  const validLimit =
                        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;

                  // Parse page to an integer or default to 1 if not provided
                  const parsedPage = page ? parseInt(page, 10) : 1;
                  const validPage =
                        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

                  const postCount = await query.post.findMany({
                        where: {
                              user_id: userId,
                        },
                  });

                  const mediaCount = await query.userMedia.count({
                        where: {
                              OR: [...postCount.map((post) => ({ post_id: post.id }))],
                        },
                  });

                  const media = await query.userMedia.findMany({
                        where: {
                              OR: [...postCount.map((post) => ({ post_id: post.id }))],
                        },
                        skip: (validPage - 1) * validLimit,
                        take: validLimit,
                        orderBy: {
                              created_at: "desc",
                        },
                  });

                  return {
                        status: true,
                        message: "Media retrieved successfully",
                        data: media,
                        total: mediaCount,
                  };
            } catch (error: any) {
                  throw new Error(error.message);
                  console.log(error);
            }
      }

      // Get Other Media
      static async GetOtherMedia({ userId, page, limit }: GetOtherMediaProps): Promise<GetOtherMediaResponse> {
            try {
                  // Parse limit to an integer or default to 5 if not provided
                  // Parse limit to an integer or default to 5 if not provided
                  const parsedLimit = limit ? parseInt(limit, 10) : 6;
                  const validLimit =
                        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;

                  // Parse page to an integer or default to 1 if not provided
                  const parsedPage = page ? parseInt(page, 10) : 1;
                  const validPage =
                        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

                  const postCount = await query.post.findMany({
                        where: {
                              user_id: Number(userId),
                        },
                  });

                  const mediaCount = await query.userMedia.count({
                        where: {
                              AND: [
                                    {
                                          accessible_to: "public",
                                    },
                                    {
                                          accessible_to: "subscribers",
                                    },
                              ],
                              media_state: "completed",
                              OR: [...postCount.map((post) => ({ post_id: post.id }))],
                        },
                  });

                  const media = await query.userMedia.findMany({
                        where: {
                              NOT: {
                                    accessible_to: "private",
                              },
                              media_state: "completed",
                              OR: [...postCount.map((post) => ({ post_id: post.id }))],
                        },
                        select: {
                              id: true,
                              media_id: true,
                              post_id: true,
                              poster: true,
                              duration: true,
                              media_state: true,
                              url: true,
                              blur: true,
                              media_type: true,
                              locked: true,
                              accessible_to: true,
                              post: {
                                    select: {
                                          user: {
                                                select: {
                                                      Subscribers: true,
                                                },
                                          },
                                    },
                              },
                        },
                        skip: (validPage - 1) * validLimit,
                        take: validLimit,
                        orderBy: {
                              created_at: "desc",
                        },
                  });

                  return {
                        status: true,
                        message: "Media retrieved successfully",
                        data: media,
                        total: mediaCount,
                  };
            } catch (error: any) {
                  console.log(error);
                  throw new Error(error.message);
            }
      }

      // Get User Post By User ID
      static async GetUserPostByID({ userId, page, limit }: GetUserPostByIdProps): Promise<GetUserPostByIdResponse> {
            try {
                  // Parse limit to an integer or default to 5 if not provided
                  const parsedLimit = limit ? parseInt(limit, 10) : 5;
                  const validLimit =
                        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;

                  // Parse page to an integer or default to 1 if not provided
                  const parsedPage = page ? parseInt(page, 10) : 1;
                  const validPage =
                        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

                  const postCount = await query.post.count({
                        where: {
                              user_id: Number(userId),
                              post_status: "approved",
                              NOT: {
                                    post_audience: "private",
                              },
                        },
                  });

                  const posts = await query.post.findMany({
                        where: {
                              user_id: Number(userId),
                              post_status: "approved",
                              NOT: {
                                    post_audience: "private",
                              },
                        },
                        select: {
                              id: true,
                              content: true,
                              post_id: true,
                              post_audience: true,
                              media: true,
                              created_at: true,
                              post_likes: true,
                              post_comments: true,
                              post_reposts: true,
                              was_repost: true,
                              repost_id: true,
                              repost_username: true,
                              UserMedia: {
                                    select: {
                                          id: true,
                                          media_id: true,
                                          post_id: true,
                                          duration: true,
                                          poster: true,
                                          url: true,
                                          blur: true,
                                          media_state: true,
                                          media_type: true,
                                          locked: true,
                                          accessible_to: true,
                                          created_at: true,
                                          updated_at: true,
                                    },
                              },
                              PostLike: {
                                    select: {
                                          post_id: true,
                                          user_id: true,
                                    },
                              },
                              user: {
                                    select: {
                                          username: true,
                                          profile_image: true,
                                          name: true,
                                          user_id: true,
                                          is_model: true,
                                          Subscribers: {
                                                select: {
                                                      subscriber_id: true,
                                                },
                                          },
                                    },
                              },
                        },
                        orderBy: {
                              created_at: "desc",
                        },
                        skip: (validPage - 1) * validLimit,
                        take: validLimit,
                  });

                  return {
                        status: true,
                        message: "Posts retrieved successfully",
                        data: posts,
                        total: postCount,
                  };
            } catch (error: any) {
                  console.log(error);
                  throw new Error(error.message)
            }
      }

      // Get Single Post By ID:

      static async GetSinglePost({ postId, userId }: { postId: string; userId: number }): Promise<GetSinglePostResponse> {
            try {
                  const post = await query.post.findFirst({
                        where: {
                              post_id: postId,
                              post_status: "approved",
                              OR: [
                                    {
                                          post_audience: "public",
                                    },
                                    {
                                          post_audience: "private",
                                    },
                                    {
                                          post_audience: "subscribers",
                                    },
                              ],
                        },
                        select: {
                              user: {
                                    select: {
                                          id: true,
                                          username: true,
                                          profile_image: true,
                                          created_at: true,
                                          name: true,
                                          is_model: true,
                                          user_id: true,
                                          Subscribers: {
                                                select: {
                                                      subscriber_id: true,
                                                },
                                          },
                                          Follow: {
                                                select: {
                                                      follower_id: true,
                                                },
                                          },
                                    },
                              },
                              id: true,
                              content: true,
                              post_id: true,
                              post_audience: true,
                              created_at: true,
                              post_likes: true,
                              media: true,
                              post_comments: true,
                              post_reposts: true,
                              PostLike: true,
                              UserMedia: true,
                              was_repost: true,
                              repost_id: true,
                              user_id: true,
                              repost_username: true,
                        },
                  });
                  console.log("Post", post);
                  console.log("UserId", userId)
                  if (!post || !userId || (post.post_audience === "private" && post.user?.id !== userId)) {
                        return {
                              status: false,
                              data: null,
                              message: "Post not found private",
                        };
                  }


                  if (!post) {
                        return {
                              status: false,
                              message: "Post not found",
                              data: null,
                        };
                  }

                  return {
                        status: true,
                        message: "Post retrieved successfully",
                        data: post,
                  };
            } catch (error: any) {
                  console.log(error);
                  throw new Error(error.message);
            }
      }
}     
