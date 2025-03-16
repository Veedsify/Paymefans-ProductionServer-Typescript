import { CreatePostProps, CreatePostResponse } from "../types/post";
import { v4 as uuid } from "uuid";
import query from "@utils/prisma";
import { PostAudience } from "@prisma/client";
import RemoveCloudflareMedia from "@libs/RemoveCloudflareMedia";


export default class PostService {
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
}
