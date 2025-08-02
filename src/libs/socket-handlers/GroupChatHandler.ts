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
      console.log("handleJoinGroupRoom - Input data:", {
        groupId: data?.groupId,
        userId: data?.userId,
        userFromSocket: user,
        socketId: socket?.id,
      });

      const { groupId, userId } = data;

      // Validate input data
      if (!groupId || !userId) {
        console.error("handleJoinGroupRoom - Missing required data:", {
          groupId,
          userId,
        });
        socket.emit("group-error", {
          message: "Group ID and User ID are required",
        });
        return;
      }

      // Parse and validate IDs
      const groupIdInt = parseInt(groupId);
      if (isNaN(groupIdInt)) {
        console.error("handleJoinGroupRoom - Invalid group ID format:", {
          groupId,
          groupIdInt,
        });
        socket.emit("group-error", {
          message: "Invalid group ID format",
        });
        return;
      }

      // Resolve user ID (handle both numeric and string formats)
      const userIdInt = await this.resolveUserId(userId);
      if (!userIdInt) {
        console.error("handleJoinGroupRoom - Could not resolve user ID:", {
          userId,
        });
        socket.emit("group-error", {
          message: "Invalid user ID or user not found",
        });
        return;
      }

      console.log("handleJoinGroupRoom - Checking membership:", {
        groupIdInt,
        userIdInt,
        originalUserId: userId,
      });

      // Verify user is a member of the group
      const membership = await query.groupMember.findFirst({
        where: {
          groupId: groupIdInt,
          userId: userIdInt,
        },
      });

      console.log("handleJoinGroupRoom - Membership result:", {
        found: !!membership,
        membership: membership
          ? {
              id: membership.id,
              role: membership.role,
              joinedAt: membership.joinedAt,
            }
          : null,
      });

      if (!membership) {
        console.error("handleJoinGroupRoom - User not a member:", {
          groupIdInt,
          userIdInt,
          originalUserId: userId,
        });
        socket.emit("group-error", {
          message: "You are not a member of this group",
        });
        return;
      }

      // Join the socket room
      const roomName = `group:${groupId}`;
      socket.join(roomName);

      console.log("handleJoinGroupRoom - Joined socket room:", {
        roomName,
        socketId: socket.id,
      });

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

      console.log("handleJoinGroupRoom - Stored in Redis:", {
        userGroupKey: `group-rooms:${userId}`,
        memberKey: `group-members:${groupId}`,
        resolvedUserId: userIdInt,
      });

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

      console.log(
        `User ${user.username} (ID: ${userIdInt}) successfully joined group room: ${roomName}`,
      );

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
  ) {
    try {
      const { groupId, userId } = data;
      const roomName = `group:${groupId}`;

      // Leave the socket room
      socket.leave(roomName);

      // Remove from Redis
      await redis.hdel(`group-rooms:${userId}`, groupId);
      await redis.hdel(`group-members:${groupId}`, userId);

      // Notify other members that user left
      socket.to(roomName).emit("group-member-left", {
        groupId,
        user: {
          id: userId,
          username: user.username,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`User ${user.username} left group room: ${roomName}`);
    } catch (error) {
      console.error("Error leaving group room:", error);
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

      // Handle attachments if any
      if (attachments && attachments.length > 0) {
        const attachmentData = attachments.map((attachment: any) => ({
          messageId: message.id,
          url: attachment.fileUrl,
          type: attachment.fileType,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
        }));

        await query.groupAttachment.createMany({
          data: attachmentData,
        });
      }

      // Fetch attachments from database to include in response
      const messageAttachments =
        attachments && attachments.length > 0
          ? await query.groupAttachment.findMany({
              where: { messageId: message.id },
            })
          : [];

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
        attachments: messageAttachments.map((att) => ({
          id: att.id,
          fileName: att.fileName,
          fileUrl: att.url,
          fileType: att.type,
          fileSize: att.fileSize,
        })),
        created_at: message.created_at,
        timestamp: new Date().toISOString(),
      };

      // Emit to all members in the group room (including sender)
      io.to(roomName).emit("new-group-message", messageData);

      console.log("Message broadcasted to room:", {
        roomName,
        messageId: message.id,
        sender: user.username,
        groupId: groupId,
      });

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

      console.log(
        `Message sent to group ${groupId} by user ${user.username} (ID: ${userIdInt})`,
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

      console.log("handleGroupTyping - Input:", {
        groupId,
        userId: user.userId,
        username: user.username,
        isTyping,
      });

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

      console.log(
        `User ${user.username} typing status in group ${groupId}: ${isTyping}`,
      );
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

      console.log("handleRestoreGroupRooms - Resolved user ID:", {
        originalUserId: userId,
        resolvedUserId: userIdInt,
      });

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

      console.log(
        `Restored ${memberships.length} group rooms for user ${userId} (ID: ${userIdInt})`,
      );
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
  static async cleanupGroupRoom(groupId: string, userId?: string) {
    try {
      if (userId) {
        // Remove specific user from group room
        await redis.hdel(`group-rooms:${userId}`, groupId);
        await redis.hdel(`group-members:${groupId}`, userId);
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
}
