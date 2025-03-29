import { CreatePostProps, CreatePostResponse, CreateRepostProps, DeletePostResponse, EditPostProps, EditPostResponse, GetMyMediaProps, GetMyMediaResponse, GetMyPostProps, GetMyPostResponse, GetOtherMediaProps, GetOtherMediaResponse, GetPostCommentsProps, GetPostCommentsResponse, GetSinglePostResponse, GetUserPostByIdProps, GetUserPostByIdResponse, LikePostProps, LikePostResponse, RepostProps, RepostResponse } from "../types/post";
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
                  // media.map(async (file) => {
                  //       const signedUrl = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${file.id}`, {
                  //             method: "POST",
                  //             headers: {
                  //                   "Authorization": `Bearer ${process.env.CLOUDFLARE_ACCOUNT_TOKEN}`
                  //             },
                  //             body: JSON.stringify({ uid: file.id, requireSignedURLs: true })  // Streaming formData
                  //       });
                  //       if (signedUrl.ok) {
                  //             const token = await signedUrl.json();
                  //             console.log("SIGNED", token);
                  //       }
                  // })
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
                              post_status: true,
                              post_impressions: true,
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
                                          id: true,
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
                                          post_status: true,
                                          post_impressions: true,
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
                                                      id: true,
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
                                          post_status: true,
                                          post_impressions: true,
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
                                                      id: true,
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
                  console.log(error);
                  throw new Error(error.message);
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
                                          id: true,
                                          user: {
                                                select: {
                                                      id: true
                                                }
                                          }
                                    }
                              }
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
                              post_status: true,
                              post_impressions: true,
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
                                          id: true,
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
      static async GetSinglePost({ postId }: { postId: string; }): Promise<GetSinglePostResponse> {
            try {
                  const post = await query.post.findFirst({
                        where: {
                              post_id: postId,
                              post_status: "approved",
                              NOT: [{
                                    post_audience: "private",
                              }],
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
                                    },
                              },
                              id: true,
                              content: true,
                              post_id: true,
                              post_audience: true,
                              post_status: true,
                              post_impressions: true,
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
                  if (!post) {
                        return {
                              error: true,
                              status: false,
                              message: "Post not found",
                              data: null,
                        };
                  }
                  if (post.post_audience === "private") {
                        return {
                              error: true,
                              status: false,
                              data: null,
                              message: "Post not Private",
                        };
                  }
                  return {
                        error: false,
                        status: true,
                        message: "Post retrieved successfully",
                        data: post,
                  };
            } catch (error: any) {
                  console.log(error);
                  throw new Error(error.message);
            }
      }
      // Edit Post
      static async EditPost({ postId }: EditPostProps): Promise<EditPostResponse> {
            try {
                  const post = await query.post.findFirst({
                        where: {
                              post_id: postId,
                              post_status: "approved",
                        },
                        select: {
                              id: true,
                              content: true,
                              post_id: true,
                              post_audience: true,
                              created_at: true,
                              post_status: true,
                              post_impressions: true,
                              post_likes: true,
                              post_comments: true,
                              post_reposts: true,
                              PostLike: true,
                              UserMedia: true,
                        },
                  });
                  if (!post) {
                        return {
                              status: false,
                              data: null,
                              message: "Post not found",
                        };
                  }
                  return {
                        status: true,
                        message: "Post retrieved successfully",
                        data: post,
                  };
            } catch (error: any) {
                  console.log(error);
                  throw new Error(error.message)
            }
      }
      // Update PostAudience
      static async UpdatePostAudience({ postId, userId, visibility }: { postId: string, userId: number; visibility: string }): Promise<any> {
            try {
                  const findPost = await query.post.findFirst({
                        where: {
                              post_id: postId,
                              user_id: userId
                        }
                  })
                  if (!findPost) {
                        return { error: true, message: "Post not found" }
                  }
                  const [updatePost, updateMedia] = await query.$transaction([
                        query.post.update({
                              where: {
                                    id: findPost.id
                              },
                              data: {
                                    post_audience: String(visibility).trim().toLowerCase() as PostAudience,
                              }
                        }),
                        query.userMedia.updateMany({
                              where: {
                                    post_id: findPost.id
                              },
                              data: {
                                    accessible_to: String(visibility).trim().toLowerCase()
                              }
                        })
                  ]);
                  if (!updatePost || !updateMedia) {
                        return { error: true, message: "Could not update post audience" }
                  }
                  return { error: false, message: "Post audience updated" }
            } catch (error: any) {
                  throw new Error(error.message)
            }
      }
      // Create Repost
      static async CreateRepost({ postId, userId }: CreateRepostProps): Promise<RepostResponse> {
            try {
                  const audienceTypes = ['private', 'subscribers', 'followers']
                  // Repost the post
                  const getPost = await query.post.findFirst({
                        where: {
                              post_id: postId,
                              post_status: "approved"
                        },
                        select: {
                              post_audience: true,
                              user: {
                                    select: {
                                          id: true
                                    }
                              },
                              id: true,
                        }
                  })
                  if (!getPost) {
                        return {
                              error: true,
                              message: "Post not found"
                        }
                  }
                  const postAudience = getPost.post_audience
                  if (audienceTypes.includes(postAudience)) {
                        const isSubscriber = await query.post.findFirst({
                              where: {
                                    post_id: postId,
                                    user: {
                                          Subscribers: {
                                                some: {
                                                      subscriber_id: userId,
                                                }
                                          }
                                    }
                              },
                        })
                        if (!isSubscriber && getPost.user.id !== userId) {
                              return {
                                    error: true,
                                    message: "You are not a subscriber of this post, therefore you cannot repost it"
                              }
                        }
                  }
                  const repostId = uuid();
                  const repost = await query.$transaction(async (transaction) => {
                        const repost = await transaction.userRepost.create({
                              data: {
                                    post_id: getPost.id,
                                    user_id: userId,
                                    repost_id: repostId
                              }
                        })
                        await transaction.post.update({
                              where: {
                                    id: getPost.id,
                              },
                              data: {
                                    post_reposts: {
                                          increment: 1
                                    },
                              }
                        })

                        return repost
                  })
                  if (repost) {
                        query.$disconnect()
                        return {
                              error: false,
                              message: "Post reposted successfully"
                        }
                  }
                  return {
                        error: true,
                        message: "An error occurred while reposting the post"
                  }
            } catch (error: any) {
                  throw new Error(error.message)
            }
      }
      // Get Post Comments
      static async GetPostComments({ postId, page = "1", limit = "10" }: GetPostCommentsProps): Promise<GetPostCommentsResponse> {
            const countComments = await query.postComment.count({
                  where: {
                        post_id: Number(postId)
                  }
            })
            const comments = await query.postComment.findMany({
                  where: {
                        post_id: Number(postId),
                  },
                  orderBy: {
                        created_at: "desc",
                  },
                  select: {
                        id: true,
                        comment: true,
                        created_at: true,
                        user: {
                              select: {
                                    id: true,
                                    user_id: true,
                                    name: true,
                                    username: true,
                                    profile_image: true,
                              },
                        },
                        PostCommentAttachments: {
                              select: {
                                    id: true,
                                    comment_id: true,
                                    path: true,
                                    type: true,
                                    created_at: true,
                              },
                        },
                        PostCommentLikes: {
                              select: {
                                    id: true,
                                    comment_id: true,
                                    user_id: true,
                                    created_at: true,
                              },
                        },
                  },
                  skip: (parseInt(page) - 1) * parseInt(limit),
                  take: parseInt(limit) + 1,
            });

            const hasMore = comments.length > parseInt(limit);
            if (hasMore) {
                  comments.pop();
            }                  
            if (!comments || comments.length == 0) {
                  return {
                        error: false,
                        message: "No comments found",
                        hasMore: false,
                        data: [],
                        total: 0
                  };
            }
            return {
                  error: false,
                  message: "Comments found",
                  data: comments,
                  hasMore: hasMore,
                  total: countComments
            };
      }
      // Like A Post
      static async LikePost({ postId, userId }: LikePostProps): Promise<LikePostResponse> {
            try {
                  let postHasBeenLiked = false;
                  // Verify if post has been liked by user
                  const postLike = await query.postLike.findFirst({
                        where: {
                              post_id: parseInt(postId),
                              user_id: userId
                        }
                  })
                  if (!postLike) {
                        await query.postLike.create({
                              data: {
                                    post_id: parseInt(postId),
                                    like_id: 1,
                                    user_id: userId
                              }
                        })
                        await query.post.update({
                              where: {
                                    id: Number(postId)
                              },
                              data: {
                                    post_likes: {
                                          increment: 1
                                    }
                              }
                        })
                        postHasBeenLiked = true;
                  } else {
                        await query.postLike.delete({
                              where: {
                                    id: postLike.id
                              }
                        })
                        await query.post.update({
                              where: {
                                    id: parseInt(postId)
                              },
                              data: {
                                    post_likes: {
                                          decrement: 1
                                    }
                              }
                        })
                  }
                  return {
                        success: true,
                        isLiked: postHasBeenLiked,
                        message: postHasBeenLiked ? "Post has been liked" : "Post has been unliked"
                  }
            } catch (error: any) {
                  console.error(error)
                  throw new Error(error.message)
            }
      }
      // Delete Post
      static async DeletePost({ postId, userId }: { postId: string; userId: number }): Promise<DeletePostResponse> {
            try {
                  const post = await query.post.findFirst({
                        where: {
                              post_id: postId,
                              user_id: userId,
                        },
                  });
                  if (!post) {
                        return {
                              status: false,
                              message: "Post not found",
                        };
                  }
                  const postMedia = await query.userMedia.findMany({
                        where: {
                              post_id: post.id,
                        }
                  })
                  if (postMedia.length > 0) {
                        const media = postMedia.map((media) => ({
                              id: media.media_id,
                              type: media.media_type
                        }))
                        console.log("Media", media)
                        if (media && media.length > 0) {
                              const removeMedia = await RemoveCloudflareMedia(media)
                              if ('error' in removeMedia && removeMedia.error) {
                                    return {
                                          status: false,
                                          message: "An error occurred while deleting media",
                                          error: removeMedia.error,
                                    };
                              }
                        }
                  }
                  await query.post.delete({
                        where: {
                              id: post.id,
                        },
                  });
                  return {
                        status: true,
                        message: "Post deleted successfully",
                  };
            } catch (error: any) {
                  console.log(error);
                  throw new Error(error.message)
            }
      }
}     
