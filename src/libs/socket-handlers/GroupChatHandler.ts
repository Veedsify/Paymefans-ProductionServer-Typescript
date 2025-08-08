import { redis } from "../RedisStore";
import query from "../../utils/prisma";
import type { SocketUser } from "../../types/socket";

interface GroupChatData {
  groupId: string;
  content?: string;
  messageType?: string;
  replyToId?: number;
  attachments?: any[];
}

interface AttachmentData {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface GroupTypingData {
  groupId: string;
  isTyping: boolean;
}

interface GroupJoinData {
  groupId: string;
  userId: string;
}

export default class GroupChatHandler {
  // Helper function to resolve user ID (convert string user_id to numeric id if needed)
  static async resolveUserId(userId: string): Promise<number | null> {
    // Try parsing as integer first
    const userIdInt = parseInt(userId);
    if (!isNaN(userIdInt)) {
      return userIdInt;
    }

    // If not a number, treat as user_id string and look up the numeric id
    try {
      const user = await query.user.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });
      return user?.id || null;
    } catch (error) {
      console.error("Error resolving user ID:", error);
      return null;
    }
  }

  // Handle user joining a group chat room
  static async handleJoinGroupRoom(
    socket: any,
    user: SocketUser,
    data: GroupJoinData,
  ) {
    try {
      const { groupId, userId } = data;

      // Validate input data
      if (!groupId || !userId) {
        socket.emit("group-error", {
          message: "Group ID and User ID are required",
        });
        return;
      }

      // Parse and validate IDs
      const groupIdInt = parseInt(groupId);
      if (isNaN(groupIdInt)) {
        socket.emit("group-error", {
          message: "Invalid group ID format",
        });
        return;
      }

      // Resolve user ID (handle both numeric and string formats)
      const userIdInt = await this.resolveUserId(userId);
      if (!userIdInt) {
        socket.emit("group-error", {
          message: "Invalid user ID or user not found",
        });
        return;
      }

      // Verify user is a member of the group
      const membership = await query.groupMember.findFirst({
        where: {
          groupId: groupIdInt,
          userId: userIdInt,
        },
      });

      if (!membership) {
        socket.emit("group-error", {
          message: "You are not a member of this group",
        });
        return;
      }

      // Join the socket room
      const roomName = `group:${groupId}`;
      socket.join(roomName);

      // Store user's group room mapping in Redis (use original userId for consistency)
      await redis.hset(`group-rooms:${userId}`, groupId, roomName);
      await redis.hset(
        `group-members:${groupId}`,
        userId,
        JSON.stringify({
          ...user,
          userId: userIdInt,
          originalUserId: userId,
          joinedAt: new Date().toISOString(),
        }),
      );

      // Notify other members that user joined
      socket.to(roomName).emit("group-member-joined", {
        groupId,
        user: {
          id: userIdInt,
          user_id: userId,
          username: user.username,
        },
        timestamp: new Date().toISOString(),
      });

      // Emit success confirmation to the user
      socket.emit("group-room-joined", {
        groupId,
        roomName,
        userId: userIdInt,
        originalUserId: userId,
        message: "Successfully joined group room",
      });
    } catch (error) {
      console.error("Error joining group room:", error);
      socket.emit("group-error", {
        message: "Failed to join group room",
      });
    }
  }

  // Handle leaving a group chat room
  static async handleLeaveGroupRoom(
    socket: any,
    user: SocketUser,
    data: GroupJoinData,
    io?: any,
  ) {
    try {
      const { groupId, userId } = data;
      const roomName = `group:${groupId}`;

      // Get user info before removing from Redis
      const userDataStr = await redis.hget(`group-members:${groupId}`, userId);
      let userData = null;
      if (userDataStr) {
        try {
          userData = JSON.parse(userDataStr);
        } catch (e) {
          userData = { userId, username: user.username };
        }
      }

      // Leave the socket room
      socket.leave(roomName);

      // Remove from Redis
      await redis.hdel(`group-rooms:${userId}`, groupId);
      await redis.hdel(`group-members:${groupId}`, userId);

      // Use io if available, otherwise fallback to socket
      const emitter = io || socket;

      // Notify other members that user left
      emitter.to(roomName).emit("group-member-left", {
        groupId,
        user: {
          id: userData?.userId || userData?.originalUserId || userId,
          username: userData?.username || user.username,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(
        `User ${user.username} (ID: ${userId}) left group room: ${roomName}`,
      );

      // Emit confirmation to the user who left
      socket.emit("group-room-left", {
        groupId,
        roomName,
        userId,
        message: "Successfully left group room",
      });
    } catch (error) {
      console.error("Error leaving group room:", error);
      socket.emit("group-error", {
        message: "Failed to leave group room",
      });
    }
  }

  // Handle sending a message to group
  static async handleGroupMessage(
    socket: any,
    user: SocketUser,
    data: GroupChatData,
    io: any,
  ) {
    try {
      const {
        groupId,
        content,
        messageType = "text",
        replyToId,
        attachments,
      } = data;

      // Parse and validate group ID
      const groupIdInt = parseInt(groupId);
      if (isNaN(groupIdInt)) {
        socket.emit("group-error", {
          message: "Invalid group ID format",
        });
        return;
      }

      // Resolve user ID
      const userIdInt = await this.resolveUserId(user.userId);
      if (!userIdInt) {
        socket.emit("group-error", {
          message: "Invalid user ID or user not found",
        });
        return;
      }

      // Verify user is a member of the group
      const membership = await query.groupMember.findFirst({
        where: {
          groupId: groupIdInt,
          userId: userIdInt,
        },
      });

      if (!membership) {
        socket.emit("group-error", {
          message: "You are not a member of this group",
        });
        return;
      }

      // Check group settings for message permissions
      const groupSettings = await query.groupSettings.findFirst({
        where: { groupId: groupIdInt },
      });

      // If moderateMessages is enabled, only admins and moderators can send messages
      if (
        groupSettings?.moderateMessages &&
        membership.role !== "ADMIN" &&
        membership.role !== "MODERATOR"
      ) {
        socket.emit("group-error", {
          message: "Only moderators and admins can send messages in this group",
        });
        return;
      }

      // Create the message in database
      const message = await query.groupMessage.create({
        data: {
          groupId: groupIdInt,
          senderId: userIdInt,
          content: content || "",
          messageType: messageType,
          replyToId: replyToId || null,
        },
        include: {
          sender: {
            select: {
              user_id: true,
              username: true,
              profile_image: true,
              is_verified: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  user_id: true,
                  username: true,
                  profile_image: true,
                },
              },
            },
          },
        },
      });

      // Handle attachments if any (files already uploaded to S3 via API)
      // Only allow image attachments in group chats
      const messageAttachments = [];
      if (attachments && attachments.length > 0) {
        // Check if any non-image attachments are being sent
        const nonImageAttachments = attachments.filter(
          (attachment: AttachmentData) =>
            !attachment.fileType || !attachment.fileType.startsWith("image/"),
        );

        if (nonImageAttachments.length > 0) {
          socket.emit("group-error", {
            message: "Only image files are allowed in group chats",
          });
          return;
        }

        // Filter to only include image attachments
        const imageAttachments = attachments.filter(
          (attachment: AttachmentData) =>
            attachment.fileType && attachment.fileType.startsWith("image/"),
        );

        for (const attachment of imageAttachments) {
          try {
            // Create attachment record in database using pre-uploaded S3 URL
            const createdAttachment = await query.groupAttachment.create({
              data: {
                messageId: message.id,
                url: attachment.fileUrl,
                type: "image",
                fileName: attachment.fileName,
                fileSize: attachment.fileSize,
              },
            });

            messageAttachments.push({
              id: createdAttachment.id,
              fileName: createdAttachment.fileName,
              fileUrl: createdAttachment.url,
              fileType: attachment.fileType,
              fileSize: createdAttachment.fileSize,
            });
          } catch (error) {
            console.error("Error saving attachment to database:", error);
            // Continue with other attachments even if one fails
          }
        }
      }

      // Emit message to all group members
      const roomName = `group:${groupId}`;
      const messageData = {
        id: message.id,
        groupId: message.groupId,
        content: message.content,
        messageType: message.messageType,
        senderId: message.senderId,
        sender: {
          user_id: (message as any).sender.user_id,
          username: (message as any).sender.username,
          profile_image: (message as any).sender.profile_image,
          is_verified: (message as any).sender.is_verified,
        },
        replyTo: (message as any).replyTo,
        attachments: messageAttachments,
        created_at: message.created_at,
        timestamp: new Date().toISOString(),
      };

      // Emit to all members in the group room (including sender)
      io.to(roomName).emit("new-group-message", messageData);

      // Store last message info in Redis for quick access
      await redis.hset(
        `group-last-message:${groupId}`,
        "data",
        JSON.stringify({
          messageId: message.id,
          content: message.content,
          senderId: message.senderId.toString(),
          senderUsername: (message as any).sender.username,
          timestamp: message.created_at,
        }),
      );
    } catch (error) {
      console.error("Error sending group message:", error);
      socket.emit("group-error", {
        message: "Failed to send message",
      });
    }
  }

  // Handle typing indicator in group
  static async handleGroupTyping(
    socket: any,
    user: SocketUser,
    data: GroupTypingData,
    io: any,
  ) {
    try {
      const { groupId, isTyping } = data;
      const roomName = `group:${groupId}`;

      // Resolve user ID
      const userIdInt = await this.resolveUserId(user.userId);
      if (!userIdInt) {
        console.error(
          "handleGroupTyping - Could not resolve user ID:",
          user.userId,
        );
        return;
      }

      // Emit typing status to other group members (exclude sender)
      socket.to(roomName).emit("group-typing", {
        groupId,
        userId: userIdInt.toString(),
        username: user.username,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      // Store typing status in Redis with expiration
      const typingKey = `group-typing:${groupId}:${userIdInt}`;
      if (isTyping) {
        await redis.setex(typingKey, 5, "true");

        // Auto-cleanup after 5 seconds
        setTimeout(async () => {
          const stillTyping = await redis.get(typingKey);
          if (stillTyping) {
            await redis.del(typingKey);
            // Emit typing stopped
            io.to(roomName).emit("group-typing", {
              groupId,
              userId: userIdInt.toString(),
              username: user.username,
              isTyping: false,
              timestamp: new Date().toISOString(),
            });
            console.log(
              `Auto-stopped typing for user ${user.username} in group ${groupId}`,
            );
          }
        }, 5000);
      } else {
        await redis.del(typingKey);
      }
    } catch (error) {
      console.error("Error handling group typing:", error);
    }
  }

  // Handle message seen/read status in group
  static async handleGroupMessageSeen(
    socket: any,
    user: SocketUser,
    data: { groupId: string; messageId: number },
  ) {
    try {
      const { groupId, messageId } = data;

      // Update message read status
      // Note: This would require adding GroupMessageRead to schema
      // For now, we'll skip this functionality
      console.log(`Message ${messageId} seen by user ${user.userId}`);

      // Emit read receipt to group
      const roomName = `group:${groupId}`;
      socket.to(roomName).emit("group-message-seen", {
        groupId,
        messageId,
        userId: user.userId,
        username: user.username,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error handling group message seen:", error);
    }
  }

  // Restore user to their group rooms on reconnection
  static async handleRestoreGroupRooms(socket: any, userId: string) {
    try {
      // Validate userId parameter
      if (!userId) {
        console.error("userId is required but not provided");
        return;
      }

      // Resolve user ID (handle both numeric and string formats)
      const userIdInt = await this.resolveUserId(userId);
      if (!userIdInt) {
        console.error(`Could not resolve userId: ${userId}`);
        return;
      }

      // Get user's active group memberships
      const memberships = await query.groupMember.findMany({
        where: {
          userId: userIdInt,
        },
        include: {
          group: true,
        },
      });

      // Rejoin all group rooms
      for (const membership of memberships) {
        const roomName = `group:${membership.groupId}`;
        socket.join(roomName);

        // Update Redis mapping
        await redis.hset(`group-rooms:${userId}`, membership.groupId, roomName);
      }
    } catch (error) {
      console.error("Error restoring group rooms:", error);
    }
  }

  // Get active members in a group
  static async getActiveGroupMembers(groupId: string) {
    try {
      const activeMembers = await redis.hgetall(`group-members:${groupId}`);
      return Object.entries(activeMembers).map(([userId, userData]) => {
        try {
          return JSON.parse(userData);
        } catch {
          return { userId };
        }
      });
    } catch (error) {
      console.error("Error getting active group members:", error);
      return [];
    }
  }

  // Clean up group room data
  static async cleanupGroupRoom(groupId: string, userId?: string, io?: any) {
    try {
      if (userId) {
        // Get user info before removing from Redis
        const userDataStr = await redis.hget(
          `group-members:${groupId}`,
          userId,
        );
        let userData = null;
        if (userDataStr) {
          try {
            userData = JSON.parse(userDataStr);
          } catch (e) {
            userData = { userId, username: "Unknown" };
          }
        }

        // Remove specific user from group room
        await redis.hdel(`group-rooms:${userId}`, groupId);
        await redis.hdel(`group-members:${groupId}`, userId);

        // Emit member left event if io is available and we have user data
        if (io && userData) {
          const roomName = `group:${groupId}`;
          io.to(roomName).emit("group-member-left", {
            groupId,
            user: {
              id: userData.userId || userData.originalUserId || userId,
              username: userData.username || "Unknown",
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Clean up entire group room
        await redis.del(`group-members:${groupId}`);
        await redis.del(`group-last-message:${groupId}`);

        // Clean up typing indicators
        const typingKeys = await redis.keys(`group-typing:${groupId}:*`);
        if (typingKeys.length > 0) {
          await redis.del(...typingKeys);
        }
      }
    } catch (error) {
      console.error("Error cleaning up group room:", error);
    }
  }

  // Bulk cleanup method for handling multiple group departures efficiently
  static async bulkCleanupUserFromGroups(
    userId: string,
    groupIds: string[],
    io?: any,
  ) {
    const cleanupResults = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const groupId of groupIds) {
      try {
        await this.cleanupGroupRoom(groupId, userId, io);
        cleanupResults.successful++;
      } catch (error) {
        cleanupResults.failed++;
        const errorMsg = `Failed to cleanup user ${userId} from group ${groupId}: ${error}`;
        cleanupResults.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return cleanupResults;
  }

  // Check if user is still connected and active in any group
  static async isUserActiveInGroups(userId: string): Promise<boolean> {
    try {
      const userGroupKeys = await redis.keys(`group-rooms:${userId}`);

      for (const key of userGroupKeys) {
        const groupRooms = await redis.hgetall(key);
        if (Object.keys(groupRooms).length > 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking user activity in groups:", error);
      return false;
    }
  }
}
