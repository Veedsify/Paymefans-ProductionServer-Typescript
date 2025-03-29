import {
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
import redis from "@libs/RedisStore";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import { AuthUser } from "types/user";
import fs from "fs";
import s3 from "@utils/s3";
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

export default class ConversationService {
  // Fetch Conversations
  // Fetch all conversations for a user
  // This method retrieves all conversations for a user, including messages and participant details.
  static async AllConversations({
    user,
    conversationId,
  }: AllConversationProps): Promise<AllConversationResponse> {
    const redisKey = `user:${user.user_id}:conversations:${conversationId}`;
    try {
      // Check if the conversation data is cached
      const cachedData = await redis.get(redisKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        return {
          error: false,
          status: true,
          receiver: parsedData.receiver,
          messages: parsedData.messages,
        };
      }

      // Use Prisma transaction for atomicity
      const result = await query.$transaction(async (prisma) => {
        // Validate user's participation in the conversation
        const validateUserConversation = await prisma.conversations.findFirst({
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
        const data = await prisma.conversations.findFirst({
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
          const receiverData = await prisma.user.findFirst({
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

          return {
            messages: data.messages,
            receiver: receiverData,
            error: false,
            status: true,
          };
        }

        return { messages: [], receiver: null, error: false, status: true };
      });

      // Cache the result in Redis
      await redis.set(redisKey, JSON.stringify(result), "EX", 3600); // Cache for 1 hour

      return result;
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
    limit = "2",
  }: {
    user: AuthUser;
    page?: string;
    limit?: string;
  }): Promise<MyConversationResponse> {
    try {
      return await query.$transaction(async (prisma) => {
        const skip = (Number(page) - 1) * Number(limit);
        const conversationsByParticipants = await prisma.conversations.findMany(
          {
            where: {
              participants: {
                some: {
                  OR: [
                    { user_1: authUser.user_id },
                    { user_2: authUser.user_id },
                  ],
                },
              },
            },
            skip,
            take: parseInt(limit) + 1, // Fetch one extra to check if there's more
          }
        );

        const hasMore = conversationsByParticipants.length > Number(limit);
        if (hasMore) {
          conversationsByParticipants.pop(); // Remove the extra item
        }

        if (
          !conversationsByParticipants ||
          conversationsByParticipants.length === 0
        ) {
          return {
            error: false,
            status: true,
            conversations: [],
            hasMore: false,
          };
        }

        const conversations = conversationsByParticipants.map(
          async (participant) => {
            const conversation = await prisma.conversations.findFirst({
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

            const receiver = await prisma.user.findFirst({
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
        ) as Promise<Conversations | null>[];

        const filteredConversations = await Promise.all(conversations)
          .then((results) => results.filter((result) => result !== null))
          .catch((error) => {
            console.error("Error filtering conversations:", error);
            return [];
          });

        return {
          error: false,
          status: true,
          conversations: filteredConversations,
          page,
          limit,
          hasMore: hasMore,
        };
      });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return {
        message: "Internal server error",
        status: false,
        error: true,
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
    file,
  }: UploadAttachmentsProps): Promise<UploadAttachmentsResponse> {
    try {
      if (!file) {
        return {
          message: "No file provided",
          status: false,
          error: true,
          attachments: [],
        };
      }

      // Check if it's a video file and process with AWS MediaConvert if needed
      const videoMimeTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
      ];
      let processedPath: string | null = null;

      if (videoMimeTypes.includes(file.mimetype)) {
        try {
          // Verify file exists and is readable
          await fs.promises.access(file.path, fs.constants.R_OK);

          // Upload original file to S3
          const s3Key = `uploads/videos/${conversationId}/${file.filename}`;

          // Create a promise that resolves when the upload is complete
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
                queueSize: 10, // Number of parts to upload in parallel
              };

              const parallelUpload = new Upload(uploadParams);

              parallelUpload.on("httpUploadProgress", (progress) => {
                console.log(
                  `Uploaded ${progress.loaded} bytes out of ${progress.total}`
                );
              });

              await parallelUpload.done();
              fs.unlinkSync(file.path);
              resolve(s3Key);
              fileStream.on("error", (err: Error) => {
                fileStream.destroy(); // Close stream on error
                reject(new Error(`Error reading file: ${err.message}`));
              });
            } catch (error: any) {
              fs.unlinkSync(file.path);
              reject(new Error(`Error uploading file: ${error.message}`));
            }
          });

          // Wait for upload to complete
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
                            MaxBitrate: 1000000,
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
                    {
                      NameModifier: "720p",
                      VideoDescription: {
                        Height: 720,
                        CodecSettings: {
                          Codec: VideoCodec.H_264,
                          H264Settings: {
                            MaxBitrate: 2000000,
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
                    {
                      NameModifier: "1080p",
                      VideoDescription: {
                        Height: 1080,
                        CodecSettings: {
                          Codec: VideoCodec.H_264,
                          H264Settings: {
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

          // Clean up original local file
          await fs.promises.unlink(file.path);

          // Set the HLS manifest path
          processedPath = `processed/${conversationId}/${file.filename}/master.m3u8`;
        } catch (error) {
          console.error(`Error processing video file ${file.filename}:`, error);
        }
      }

      //   const OnUploadComplete = async (fileUrl: string) => {
      //     console.log("File URL:", fileUrl);
      //   };

      //   await UploadImageToS3({
      //     file: file,
      //     folder: "attachments/images",
      //     contentType: file.mimetype,
      //     deleteLocal: true,
      //     format: "webp",
      //     quality: 100,
      //     resize: { width: 1200, height: null, fit: "cover", position: "center" },
      //     saveToDb: false,
      //     onUploadComplete: async (url: string) => OnUploadComplete(url),
      //   });

      return {
        message: "Attachment uploaded successfully",
        status: true,
        error: false,
        attachments: processedPath ? [processedPath] : [],
      };
    } catch (error) {
      console.error("Error uploading attachment:", error);
      return {
        message: "Internal server error",
        status: false,
        error: true,
        attachments: [],
      };
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
  static async GetUserConversations (userId: string): Promise<GetUserConversationsReponse> {
    return await query.$transaction(async (tx) => {
      // Fetch conversations with essential relations
      const conversationsData = await tx.conversations.findMany({
        where: {
          participants: {
            some: {
              OR: [{ user_1: userId }, { user_2: userId }]
            }
          }
        },
        select: {
          conversation_id: true,
          participants: true,
          messages: {
            orderBy: { created_at: "desc" },
            take: 1
          }
        }
      });
  
      if (!conversationsData.length) return { conversations: [], status: true };
  
      // Batch process participants and messages
      const receiverIds = conversationsData.flatMap(conv => {
        const participant = conv.participants.find(p => 
          p.user_1 === userId || p.user_2 === userId
        );
        return participant ? 
          [participant.user_1 === userId ? participant.user_2 : participant.user_1] : 
          [];
      });
  
      // Batch fetch user data
      const users = await tx.user.findMany({
        where: { user_id: { in: receiverIds } },
        select: {
          user_id: true,
          name: true,
          username: true,
          profile_image: true
        }
      });
  
      const userMap = _.keyBy(users, 'user_id');
  
      // Map conversations with Lodash
      const conversations = _.chain(conversationsData)
        .map(conv => {
          const participant = conv.participants.find(p => 
            p.user_1 === userId || p.user_2 === userId
          );
          if (!participant) return null;
  
          const receiverId = participant.user_1 === userId ? 
            participant.user_2 : 
            participant.user_1;
          const user = userMap[receiverId];
          const lastMessage = conv.messages[0] || { created_at: new Date(0) };
  
          return {
            conversation: user,
            conversation_id: conv.conversation_id,
            lastMessage,
            receiver: user
          };
        })
        .compact()
        .orderBy([conv => conv.lastMessage.created_at], ['desc'])
        .value();
  
      return { conversations, status: true };
    });
  }
}
