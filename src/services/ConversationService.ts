import type {
  AllConversationProps,
  AllConversationResponse,
  Conversations,
  CreateNewConversationResponse,
  GetUserConversationsReponse,
  MyConversationResponse,
  SearchMessageResponse,
  SearchMessagesProp,
  UploadAttachmentsProps,
  UploadAttachmentsResponse,
} from "../types/conversations";
import { redis } from "@libs/RedisStore";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import type { AuthUser } from "types/user";
import fs from "fs";
import s3 from "@utils/s3";
import path from "path";
import {
  CreateJobCommand,
  OutputGroupType,
  AacCodingMode,
  MediaConvertClient,
  VideoCodec,
  AudioCodec,
  ContainerType,
} from "@aws-sdk/client-mediaconvert";
const { AWS_ACCESS_KEY, AWS_REGION, AWS_SECRET_KEY } = process.env;
import { Upload } from "@aws-sdk/lib-storage";
import _ from "lodash";
import type { Messages } from "@prisma/client";
import { UploadImageToS3 } from "@libs/UploadImageToS3";
export default class ConversationService {
  // Fetch Conversations
  // Fetch all conversations for a user
  // This method retrieves all conversations for a user, including messages and participant details.
  static async AllConversations({
    user,
    conversationId,
  }: AllConversationProps): Promise<AllConversationResponse> {
    // const redisKey = `user:${user.user_id}:conversations:${conversationId}`;
    try {
      // Check if the conversation data is cached
      // const cachedData = await redis.get(redisKey);
      // if (cachedData) {
      //   console.log(cachedData);
      //   const parsedData = JSON.parse(cachedData);
      //   return {
      //     error: false,
      //     status: true,
      //     receiver: parsedData.receiver,
      //     messages: parsedData.messages,
      //   };
      // }
      // Use Prisma transaction for atomicity
      // Validate user's participation in the conversation
      const validateUserConversation = await query.conversations.findFirst({
        where: {
          conversation_id: conversationId,
          participants: {
            some: {
              OR: [{ user_1: user.user_id }, { user_2: user.user_id }],
            },
          },
        },
        select: { id: true, conversation_id: true },
      });
      if (!validateUserConversation) {
        return {
          messages: [],
          receiver: null,
          message: "Invalid conversation",
          status: false,
          invalid_conversation: true,
          error: true,
        };
      }
      // Fetch conversation details
      const data = await query.conversations.findFirst({
        where: { conversation_id: conversationId },
        select: {
          messages: { orderBy: { created_at: "asc" } },
          participants: true,
        },
      });
      if (!data) {
        return { messages: [], receiver: null, error: false, status: true };
      }
      // Determine the receiver
      const participant = data.participants.find(
        (p) => p.user_1 === user.user_id || p.user_2 === user.user_id
      );
      if (participant) {
        const receiverId =
          participant.user_1 === user.user_id
            ? participant.user_2
            : participant.user_1;
        // Fetch receiver data
        const receiverData = await query.user.findFirst({
          where: { user_id: receiverId },
          select: {
            id: true,
            user_id: true,
            name: true,
            username: true,
            profile_image: true,
            Settings: true,
          },
        });
        const result = {
          messages: data.messages,
          receiver: receiverData,
          error: false,
          status: true,
        } as AllConversationResponse;
        // await redis.set(redisKey, JSON.stringify(result), "EX", 3600); // Cache for 1 hour
        return result;
      }
      // Cache the result in Redis
      return { messages: [], receiver: null, error: false, status: true };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return {
        message: "Internal server error",
        error: true,
        status: false,
        messages: [],
        receiver: null,
      };
    } finally {
      await query.$disconnect(); // Ensure connection is closed
    }
  }
  // Create Conversation
  // Create a new conversation between two users
  // This method creates a new conversation and adds the participants to it.
  static async CreateConversation({
    user,
    profileId,
  }: {
    user: AuthUser;
    profileId: string;
  }): Promise<CreateNewConversationResponse> {
    const conversationId = `CONV${GenerateUniqueId()}`;
    try {
      // Check if user has a conversation already
      return await query.$transaction(async (prisma) => {
        const getConversation = await prisma.conversations.findFirst({
          where: {
            OR: [
              {
                participants: {
                  every: {
                    user_1: user.user_id,
                    user_2: profileId,
                  },
                },
              },
              {
                participants: {
                  every: {
                    user_1: profileId,
                    user_2: user.user_id,
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            conversation_id: true,
          },
        });
        if (getConversation) {
          return {
            error: false,
            message: "Conversation already exists",
            status: true,
            conversation_id: getConversation.conversation_id,
          };
        }
        // Create a new conversation
        const createConversation = await prisma.conversations.create({
          data: {
            conversation_id: conversationId,
            participants: {
              create: {
                user_1: user.user_id,
                user_2: profileId,
              },
            },
          },
        });
        if (createConversation) {
          return {
            message: "Conversation created",
            status: true,
            error: false,
            conversation_id: conversationId,
          };
        }
        return {
          message: "Error creating conversation",
          status: false,
          error: true,
          conversation_id: null,
        };
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
      return {
        message: "Internal server error",
        status: false,
        error: true,
        conversation_id: null,
      };
    }
  }
  // Fetch My Conversations
  // Fetch all conversations for the authenticated user
  // This method retrieves all conversations for the authenticated user.
  static async MyConversations({
    user: authUser,
    page = "1",
    limit = "30",
  }: {
    user: AuthUser;
    page?: string;
    limit?: string;
  }): Promise<MyConversationResponse> {
    try {
      const skip = (Number(page) - 1) * Number(limit);

      // Unread Count Of Messages
      const unreadCount = await query.messages.findMany({
        orderBy: {
          created_at: 'desc', 
        },
        take: 1,
        where: {
          sender:{
            id: {not: authUser.id}
          },  
          Conversations: {
            participants: {
              some: {
                OR: [{ user_1: authUser.user_id }, { user_2: authUser.user_id }],
              },
            },
          },
          seen: false,
        },
      });
      
      console.log(unreadCount); 

      // Fetch conversations
      const conversationsByParticipants = await query.conversations.findMany({
        where: {
          participants: {
            some: {
              OR: [{ user_1: authUser.user_id }, { user_2: authUser.user_id }],
            },
          },
        },
        skip,
        take: parseInt(limit) + 1, // Fetch one extra to check if there's more
      });

      const hasMore = conversationsByParticipants.length > Number(limit);
      if (hasMore) {
        conversationsByParticipants.pop(); // Remove the extra item
      }

      if (!conversationsByParticipants.length) {
        return {
          error: false,
          status: true,
          conversations: [],
          hasMore: false,
          unreadCount: unreadCount.length,
        };
      }

      // Process conversations in parallel
      const conversationsPromises = conversationsByParticipants.map(
        async (participant) => {
          const conversation = await query.conversations.findFirst({
            where: { conversation_id: participant.conversation_id },
            select: {
              messages: { orderBy: { created_at: "desc" }, take: 1 },
              participants: true,
            },
          });

          if (!conversation) {
            return null;
          }

          const participantData = conversation.participants.find(
            (p) =>
              p.user_1 === authUser.user_id || p.user_2 === authUser.user_id
          );

          if (!participantData) {
            return null;
          }

          const receiverId =
            participantData.user_1 === authUser.user_id
              ? participantData.user_2
              : participantData.user_1;

          const receiver = await query.user.findFirst({
            where: { user_id: receiverId },
            select: {
              id: true,
              user_id: true,
              name: true,
              username: true,
              profile_image: true,
            },
          });

          return {
            receiver,
            conversation_id: participant.conversation_id,
            lastMessage: conversation.messages[0],
          };
        }
      );

      // Wait for all promises and filter out null values
      const filteredConversations = await Promise.all(conversationsPromises)
        .then((results) =>
          results
            .filter((result) => result !== null && result.receiver !== null)
            .sort((a, b) => {
              // If both conversations have last messages, sort by their creation date
              if (a?.lastMessage?.created_at && b?.lastMessage?.created_at) {
                return (
                  new Date(b.lastMessage.created_at).getTime() -
                  new Date(a.lastMessage.created_at).getTime()
                );
              }
              // If a doesn't have a last message but b does, b comes first
              else if (!a?.lastMessage && b?.lastMessage) {
                return 1;
              }
              // If b doesn't have a last message but a does, a comes first
              else if (a?.lastMessage && !b?.lastMessage) {
                return -1;
              }
              // If neither have last messages, leave in original order
              return 0;
            })
        )
        .catch((error) => {
          console.error("Error processing conversations:", error);
          return [];
        });

      return {
        error: false,
        status: true,
        conversations: filteredConversations as Conversations[],
        unreadCount: unreadCount.length,
        hasMore,
      };
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return {
        message: "Internal server error",
        status: false,
        error: true,
        unreadCount: 0,
        conversations: [],
        hasMore: false,
      };
    }
  }
  // Upload Attachments
  // Upload attachments to a conversation
  // This method uploads attachments to a conversation and returns the attachment URLs.
  static async UploadAttachments({
    conversationId,
    files,
  }: UploadAttachmentsProps): Promise<UploadAttachmentsResponse> {
    try {
      const attachments = files["attachments[]"];
      if (!attachments || attachments.length === 0) {
        return {
          message: "No files provided",
          status: false,
          error: true,
          attachments: [],
        };
      }

      const videoMimeTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
      ];

      const processedPaths: any[] = [];

      // Process each file in parallel
      await Promise.all(
        attachments.map(async (file) => {
          try {
            let processedPath: any | null = null;

            // Check if it's a video file
            if (videoMimeTypes.includes(file.mimetype)) {
              try {
                // Verify file exists and is readable
                await fs.promises.access(file.path, fs.constants.R_OK);

                // Upload original file to S3
                const s3Key = `uploads/videos/${conversationId}/${file.filename}`;

                const uploadPromise = new Promise(async (resolve, reject) => {
                  try {
                    const fileStream = fs.createReadStream(file.path);
                    fileStream.on("error", (err: Error) => {
                      reject(new Error(`Error reading file: ${err.message}`));
                    });

                    const uploadParams = {
                      client: s3,
                      params: {
                        Bucket: process.env.S3_BUCKET_NAME!,
                        Key: s3Key,
                        Body: fileStream,
                        ContentLength: file.size,
                        ContentType: file.mimetype,
                      },
                      queueSize: 10,
                    };

                    const parallelUpload = new Upload(uploadParams);
                    parallelUpload.on("httpUploadProgress", (progress) => {
                      console.log(
                        `Uploaded ${progress.loaded} bytes out of ${progress.total} for ${file.filename}`
                      );
                    });

                    await parallelUpload.done();
                    fs.unlinkSync(file.path);
                    resolve(s3Key);
                  } catch (error: any) {
                    fs.unlinkSync(file.path);
                    reject(new Error(`Error uploading file: ${error.message}`));
                  }
                });

                await uploadPromise;
                console.log(`Successfully uploaded ${file.filename} to S3`);

                const jobSettings = {
                  Queue: process.env.AWS_MEDIACONVERT_QUEUE_ARN,
                  Role: process.env.AWS_MEDIACONVERT_ROLE_ARN,
                  Settings: {
                    Inputs: [
                      {
                        FileInput: `s3://${process.env.S3_BUCKET_NAME}/${s3Key}`,
                        ContainerSettings: {
                          Container: ContainerType.MP4,
                        },
                      },
                    ],
                    OutputGroups: [
                      {
                        Name: "HLS Output",
                        OutputGroupSettings: {
                          Type: OutputGroupType.HLS_GROUP_SETTINGS,
                          HlsGroupSettings: {
                            SegmentLength: 6,
                            MinSegmentLength: 0,
                            Destination: `s3://${process.env.S3_BUCKET_NAME}/processed/${conversationId}/${file.filename}/`,
                          },
                        },
                        Outputs: [
                          {
                            NameModifier: "360p",
                            VideoDescription: {
                              Height: 360,
                              CodecSettings: {
                                Codec: VideoCodec.H_264,
                                H264Settings: {
                                  RateControlMode: "QVBR", // Explicitly set rate control mode
                                  MaxBitrate: 1000000,
                                  QvbrQualityLevel: 8,
                                  // Remove any Bitrate setting if present
                                },
                              },
                            },
                            AudioDescriptions: [
                              {
                                CodecSettings: {
                                  Codec: AudioCodec.AAC,
                                  AacSettings: {
                                    Bitrate: 128000,
                                    CodingMode: AacCodingMode.CODING_MODE_2_0,
                                    SampleRate: 48000,
                                  },
                                },
                              },
                            ],
                          },
                          {
                            NameModifier: "720p",
                            VideoDescription: {
                              Height: 720,
                              CodecSettings: {
                                Codec: VideoCodec.H_264,
                                H264Settings: {
                                  RateControlMode: "QVBR", // Explicitly set rate control mode
                                  MaxBitrate: 2000000,
                                  QvbrQualityLevel: 8,
                                  // Remove any Bitrate setting if present
                                },
                              },
                            },
                            AudioDescriptions: [
                              {
                                CodecSettings: {
                                  Codec: AudioCodec.AAC,
                                  AacSettings: {
                                    Bitrate: 128000,
                                    CodingMode: AacCodingMode.CODING_MODE_2_0,
                                    SampleRate: 48000,
                                  },
                                },
                              },
                            ],
                          },
                          {
                            NameModifier: "1080p",
                            VideoDescription: {
                              Height: 1080,
                              CodecSettings: {
                                Codec: VideoCodec.H_264,
                                H264Settings: {
                                  RateControlMode: "QVBR", // Explicitly set rate control mode
                                  MaxBitrate: 4000000,
                                  QvbrQualityLevel: 8,
                                },
                              },
                            },
                            AudioDescriptions: [
                              {
                                CodecSettings: {
                                  Codec: AudioCodec.AAC,
                                  AacSettings: {
                                    Bitrate: 128000,
                                    CodingMode: AacCodingMode.CODING_MODE_2_0,
                                    SampleRate: 48000,
                                  },
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                };

                const processCommand = new CreateJobCommand(jobSettings);
                const client = new MediaConvertClient({
                  region: AWS_REGION as string,
                  credentials: {
                    accessKeyId: AWS_ACCESS_KEY as string,
                    secretAccessKey: AWS_SECRET_KEY as string,
                  },
                });

                const data = await client.send(processCommand);
                console.log("MediaConvert Job created:", data);

                await fs.promises.unlink(file.path);
                processedPath = {
                  url: `processed/${conversationId}/${file.filename}/master.m3u8`,
                  name: file.filename,
                  size: file.size,
                  type: file.mimetype,
                  extension: path.extname(file.originalname),
                };
              } catch (error) {
                console.error(
                  `Error processing video file ${file.filename}:`,
                  error
                );
              }
            }

            // For non-video files or if video processing fails, you might want to add other processing here
            // ...

            // Upload non-video files to S3
            if (file.mimetype.startsWith("image/")) {
              await UploadImageToS3({
                file,
                folder: "attachments",
                format: "webp",
                deleteLocal: true,
                quality: 100,
                onUploadComplete: (url: string) => {
                  processedPath = {
                    url,
                    name: file.filename,
                    size: file.size,
                    type: file.mimetype,
                    extension: path.extname(file.originalname),
                  };
                },
                resize: {
                  height: null,
                  width: 1200,
                  fit: "cover",
                  position: "center",
                },
                saveToDb: true,
              });
            }

            if (processedPath) {
              processedPaths.push(processedPath);
              console.log(processedPaths);
            }
          } catch (error) {
            console.error(`Error processing file ${file.filename}:`, error);
          }
        })
      );

      return {
        message:
          processedPaths.length > 0
            ? "Attachments uploaded successfully"
            : "Some files failed to upload",
        status: false,
        error: false,
        attachments: processedPaths,
      };
    } catch (error: any) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  // Search Messages
  // Search For Messages In A Conversation
  static async SearchMessages({
    q,
    conversationId,
  }: SearchMessagesProp): Promise<SearchMessageResponse> {
    try {
      if (!q || q.length == 0) {
        return { error: false, messages: [] };
      }
      const messages = await query.messages.findMany({
        where: {
          conversationsId: conversationId,
          OR: [
            {
              Conversations: {
                participants: {
                  some: {
                    OR: [
                      { user_1: { contains: q } },
                      { user_2: { contains: q } },
                    ],
                  },
                },
              },
            },
            {
              message: {
                contains: q,
              },
            },
          ],
        },
      });
      return { error: false, messages };
    } catch (error) {
      return { error: true, messages: [] };
    }
  }
  // GetUser Conversations
  // Fetch all conversations for a specific user
  static async GetUserConversations(
    userId: string
  ): Promise<GetUserConversationsReponse> {
    // Fetch conversations with essential relations
    const conversationsData = await query.conversations.findMany({
      where: {
        participants: {
          some: {
            OR: [{ user_1: userId }, { user_2: userId }],
          },
        },
      },
      select: {
        conversation_id: true,
        participants: true,
        messages: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    if (!conversationsData.length) return { conversations: [], status: true };

    // Batch process participants and messages
    const receiverIds = conversationsData.flatMap((conv) => {
      const participant = conv.participants.find(
        (p) => p.user_1 === userId || p.user_2 === userId
      );
      return participant
        ? [
            participant.user_1 === userId
              ? participant.user_2
              : participant.user_1,
          ]
        : [];
    });

    // Batch fetch user data
    const users = await query.user.findMany({
      where: { user_id: { in: receiverIds } },
      select: {
        user_id: true,
        name: true,
        username: true,
        profile_image: true,
      },
    });

    // Create user map
    const userMap = users.reduce((acc, user) => {
      acc[user.user_id] = user;
      return acc;
    }, {} as Record<string, (typeof users)[0]>);

    // Map conversations
    const conversations = conversationsData
      .map((conv) => {
        const participant = conv.participants.find(
          (p) => p.user_1 === userId || p.user_2 === userId
        );
        if (!participant) return null;

        const receiverId =
          participant.user_1 === userId
            ? participant.user_2
            : participant.user_1;

        const user = userMap[receiverId];
        // Skip this conversation if user is undefined
        if (!user) return null;

        const lastMessage = conv.messages[0] as Messages;

        return {
          conversation: {
            user_id: user.user_id,
            name: user.name,
            username: user.username,
            profile_image: user.profile_image || "", // Ensure profile_image is never null
          },
          conversation_id: conv.conversation_id,
          lastMessage: lastMessage,
          receiver: user,
        };
      })
      .filter((conv): conv is NonNullable<typeof conv> => conv !== null) // Type guard to remove null values
      .sort((a, b) => {
        // Equivalent to Lodash's orderBy
        // If both conversations have last messages, sort by their creation date
        if (a.lastMessage?.created_at && b.lastMessage?.created_at) {
          return (
            new Date(b.lastMessage.created_at).getTime() -
            new Date(a.lastMessage.created_at).getTime()
          );
        }
        // If a doesn't have a last message but b does, b comes first
        else if (!a.lastMessage && b.lastMessage) {
          return 1;
        }
        // If b doesn't have a last message but a does, a comes first
        else if (a.lastMessage && !b.lastMessage) {
          return -1;
        }
        // If neither have last messages, leave in original order
        else {
          return 0;
        }
      });

    return { conversations, status: true };
  }
  // Search Conversations
  static async SearchConversations({
    q,
    user,
    page = 1,
    limit = 30,
  }: {
    q: string;
    user: AuthUser;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      if (!q || q.length === 0) {
        return { error: false, messages: [], total: 0 };
      }
      // Normalize pagination
      const parsedPage = Math.max(1, page);
      const parsedPageSize = Math.min(100, Math.max(1, limit));
      // Cache key with pagination context
      const cacheKey = `search:${user.user_id}:${q}:${parsedPage}:${parsedPageSize}`;
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      // Database query with pagination
      const [messages, total] = await Promise.all([
        query.messages.findMany({
          where: {
            message: { contains: q },
            Conversations: {
              participants: {
                some: {
                  OR: [{ user_1: user.user_id }, { user_2: user.user_id }],
                },
              },
            },
          },
          orderBy: { created_at: "desc" },
          skip: (parsedPage - 1) * parsedPageSize,
          take: parsedPageSize,
          include: {
            sender: true,
            receiver: true,
            Conversations: true,
          },
        }),
        query.messages.count({
          where: {
            message: { contains: q },
            Conversations: {
              participants: {
                some: {
                  OR: [{ user_1: user.user_id }, { user_2: user.user_id }],
                },
              },
            },
          },
        }),
      ]);
      // Cache structure with pagination metadata
      const result = {
        error: false,
        messages,
        total,
        page: parsedPage,
        limit: parsedPageSize,
        hasMore: total > parsedPage * parsedPageSize,
      };
      // Cache with 60-second TTL
      await redis.setex(cacheKey, 60, JSON.stringify(result));
      return result;
    } catch (error) {
      console.error("Search error:", error);
      return { error: true, messages: [], total: 0, hasMore: false };
    }
  }
}
