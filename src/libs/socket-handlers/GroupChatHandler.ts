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
  // Handle user joining a group chat room
  static async handleJoinGroupRoom(
    socket: any,
    user: SocketUser,
    data: GroupJoinData,
  ) {
    try {
      const { groupId, userId } = data;

      // Verify user is a member of the group
      const membership = await query.groupMember.findFirst({
        where: {
          groupId: parseInt(groupId),
          userId: parseInt(userId),
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

      // Store user's group room mapping in Redis
      await redis.hset(`group-rooms:${userId}`, groupId, roomName);
      await redis.hset(
        `group-members:${groupId}`,
        userId,
        JSON.stringify({
          ...user,
          joinedAt: new Date().toISOString(),
        }),
      );

      // Notify other members that user joined
      socket.to(roomName).emit("group-member-joined", {
        groupId,
        user: {
          id: userId,
          username: user.username,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`User ${user.username} joined group room: ${roomName}`);
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

      // Verify user is a member of the group
      const membership = await query.groupMember.findFirst({
        where: {
          groupId: parseInt(groupId),
          userId: parseInt(user.userId),
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
        where: { groupId: parseInt(groupId) },
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
          groupId: parseInt(groupId),
          senderId: parseInt(user.userId),
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

      // Emit message to all group members
      const roomName = `group:${groupId}`;
      const messageData = {
        id: message.id,
        groupId: message.groupId,
        content: message.content,
        messageType: message.messageType,
        senderId: message.senderId.toString(),
        sender: (message as any).sender,
        replyTo: (message as any).replyTo,
        attachments: attachments || [],
        createdAt: message.createdAt,
        timestamp: new Date().toISOString(),
      };

      // Emit to all members in the group room
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
          timestamp: message.createdAt,
        }),
      );

      console.log(`Message sent to group ${groupId} by ${user.username}`);
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
  ) {
    try {
      const { groupId, isTyping } = data;
      const roomName = `group:${groupId}`;

      // Emit typing status to other group members
      socket.to(roomName).emit("group-typing", {
        groupId,
        userId: user.userId,
        username: user.username,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      // Store typing status in Redis with expiration
      if (isTyping) {
        await redis.setex(`group-typing:${groupId}:${user.userId}`, 5, "true");
      } else {
        await redis.del(`group-typing:${groupId}:${user.userId}`);
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
      // Get user's active group memberships
      const memberships = await query.groupMember.findMany({
        where: {
          userId: parseInt(userId),
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
        `Restored ${memberships.length} group rooms for user ${userId}`,
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
