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
import path from "path";
import _ from "lodash";
import type { Messages } from "@prisma/client";
import { UploadImageToS3 } from "@libs/UploadImageToS3";
import tusUploader from "@libs/tus";

export default class ConversationService {
    // Conversation Receiver
    // Fetch the receiver of a conversation
    static async ConversationReceiver({
        user,
        conversationId,
    }: {
        user: AuthUser;
        conversationId: string;
    }): Promise<{ receiver: any; error: boolean }> {
        try {
            // Fetch the conversation with participants
            const conversation = await query.conversations.findFirst({
                where: {
                    conversation_id: conversationId,
                    participants: {
                        some: {
                            OR: [{ user_1: user.user_id }, { user_2: user.user_id }],
                        },
                    },
                },
                select: {
                    participants: true,
                },
            });
            if (!conversation) {
                return { receiver: null, error: true };
            }

            // Find the participant that is not the current user
            const participant = conversation.participants.find(
                (p) => p.user_1 === user.user_id ? p.user_2 : p.user_1
            );

            if (!participant) {
                return { receiver: null, error: true };
            }

            // Fetch the receiver's details
            const receiverId =
                participant.user_1 === user.user_id ? participant.user_2 : participant.user_1;

            const receiver = await query.user.findFirst({
                where: { user_id: receiverId },
                select: {
                    id: true,
                    user_id: true,
                    name: true,
                    username: true,
                    profile_image: true,
                    active_status: true,
                    Settings: true,
                },
            });

            return { receiver, error: false };
        } catch (error) {
            console.error("Error fetching conversation receiver:", error);
            throw new Error("Failed to fetch conversation receiver");
        } finally {
            if (query.$disconnect) {
                await query.$disconnect();
            }
        }
    }

    // Fetch Conversations
    // Fetch all conversations for a user
    // This method retrieves all conversations for a user, including messages and participant details.
    static async AllConversations({
        user,
        conversationId,
        cursor,
    }: AllConversationProps): Promise<AllConversationResponse> {
        try {
            // 1. Fetch conversation and validate participation in one query
            const conversation = await query.conversations.findFirst({
                where: {
                    conversation_id: conversationId,
                    participants: {
                        some: {
                            OR: [{ user_1: user.user_id }, { user_2: user.user_id }],
                        },
                    },
                },
                select: { participants: true, conversation_id: true },
            });

            if (!conversation) {
                return {
                    messages: [],
                    message: "Invalid conversation",
                    status: false,
                    invalid_conversation: true,
                    error: true,
                };
            }

            // 2. Get pagination limit
            const messagesPerPage = Number(process.env.MESSAGES_PER_PAGE) || 20;

            // 3. Fetch paginated messages (fetch one extra for hasMore)
            const messages = await query.messages.findMany({
                where: {
                    conversationsId: conversationId,
                    ...(cursor && { id: { lt: cursor } }),
                },
                orderBy: [{ id: "desc" }],
                take: messagesPerPage, // +1 to check if there's a next page
            });

            const nextCursor = messages && messages.length > 0 && messages[messages.length - 1].id >= 1
                ? messages[messages.length - 1].id
                : undefined;


            const response = {
                messages: messages as Messages[],
                error: false,
                status: true,
                nextCursor
            };

            return response;
        } catch (error) {
            console.error("Error fetching conversation:", error);
            throw new Error("Failed to fetch conversation messages");
        } finally {
            if (query.$disconnect) {
                await query.$disconnect();
            }
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
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const takeNum = Math.max(1, parseInt(limit, 10) || 30);
            const skip = (pageNum - 1) * takeNum;

            // 1. Get unread count in one query
            const unreadCount = await query.messages.count({
                orderBy: { created_at: "desc" },
                take: 1,
                where: {
                    sender: { id: { not: authUser.id } },
                    seen: false,
                    Conversations: {
                        participants: {
                            some: {
                                OR: [
                                    { user_1: authUser.user_id },
                                    { user_2: authUser.user_id },
                                ],
                            },
                        },
                    },
                },
            });

            // 2. Get conversation IDs paginated
            const conversations = await query.conversations.findMany({
                where: {
                    participants: {
                        some: {
                            OR: [{ user_1: authUser.user_id }, { user_2: authUser.user_id }],
                        },
                    },
                },
                orderBy: { updated_at: "desc" }, // or created_at, as you need
                skip,
                take: takeNum + 1, // +1 to detect if there's more
                select: {
                    conversation_id: true,
                    participants: true,
                },
            });

            const hasMore = conversations.length > takeNum;
            if (hasMore) conversations.pop();

            if (!conversations.length) {
                return {
                    error: false,
                    status: true,
                    conversations: [],
                    hasMore: false,
                    page: pageNum,
                    unreadCount,
                };
            }

            // 3. Gather all conversation IDs and participant IDs for batch fetching
            const conversationIds = conversations.map((c) => c.conversation_id);

            // 4. Batch fetch latest messages for each conversation
            const messages = await query.messages.findMany({
                where: { conversationsId: { in: conversationIds } },
                orderBy: { created_at: "desc" },
                distinct: ["conversationsId"],
                // Some ORMs may require a workaround to get "latest per conversation"
            });

            // 5. Determine receiver IDs for batch user fetch
            const receiverIds = conversations
                .map((c) => {
                    const p = c.participants.find(
                        (p: any) =>
                            p.user_1 === authUser.user_id || p.user_2 === authUser.user_id,
                    );
                    return p
                        ? p.user_1 === authUser.user_id
                            ? p.user_2
                            : p.user_1
                        : null;
                })
                .filter(Boolean);

            const receivers = await query.user.findMany({
                where: { user_id: { in: receiverIds as any } },
                select: {
                    id: true,
                    user_id: true,
                    name: true,
                    username: true,
                    profile_image: true,
                },
            });

            // 6. Map user_id to user for quick lookup
            const receiverMap = new Map(receivers.map((u) => [u.user_id, u]));

            // 7. Assemble the conversation results
            const conversationsResult = conversations
                .map((convo) => {
                    const lastMessage =
                        messages.find((m) => m.conversationsId === convo.conversation_id) ||
                        null;
                    const p = convo.participants.find(
                        (p: any) =>
                            p.user_1 === authUser.user_id || p.user_2 === authUser.user_id,
                    );
                    const receiverId = p
                        ? p.user_1 === authUser.user_id
                            ? p.user_2
                            : p.user_1
                        : null;
                    const receiver = receiverId ? receiverMap.get(receiverId) : null;
                    return receiver
                        ? {
                            receiver,
                            conversation_id: convo.conversation_id,
                            lastMessage,
                        }
                        : null;
                })
                .filter(Boolean);

            // 8. Sort conversations by lastMessage date
            conversationsResult.sort((a, b) => {
                if (a?.lastMessage?.created_at && b?.lastMessage?.created_at) {
                    return (
                        new Date(b.lastMessage.created_at).getTime() -
                        new Date(a.lastMessage.created_at).getTime()
                    );
                }
                if (!a?.lastMessage && b?.lastMessage) return 1;
                if (a?.lastMessage && !b?.lastMessage) return -1;
                return 0;
            });

            return {
                error: false,
                status: true,
                conversations: conversationsResult as Conversations[],
                unreadCount,
                hasMore,
                page: pageNum,
            };
        } catch (error: any) {
            console.error("Error fetching conversations:", error);
            throw new Error(error.message);
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
                                // Upload Videos To CloudFlare Streams
                                const fileId = `video-${GenerateUniqueId()}`;
                                const filePath = file.path;
                                file.filename = `paymefans-${conversationId}-${fileId}${path.extname(
                                    file.path,
                                )}`;
                                const video = await tusUploader({ filePath, file, fileId });
                                if ("error" in video) {
                                    throw new Error(video.message);
                                }
                                processedPath = {
                                    url: `${process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN}${video.mediaId}/manifest/video.m3u8`,
                                    name: file.filename,
                                    size: file.size,
                                    type: file.mimetype,
                                    extension: path.extname(file.originalname),
                                };
                                await fs.promises.unlink(file.path);
                            } catch (error) {
                                console.error(
                                    `Error processing video file ${file.filename}:`,
                                    error,
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
                }),
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
        userId: string,
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
                (p) => p.user_1 === userId || p.user_2 === userId,
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
        const userMap = users.reduce(
            (acc, user) => {
                acc[user.user_id] = user;
                return acc;
            },
            {} as Record<string, (typeof users)[0]>,
        );
        // Map conversations
        const conversations = conversationsData
            .map((conv) => {
                const participant = conv.participants.find(
                    (p) => p.user_1 === userId || p.user_2 === userId,
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
                        message: { contains: q, mode: "insensitive" },
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
                        message: { contains: q, mode: "insensitive" },
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
