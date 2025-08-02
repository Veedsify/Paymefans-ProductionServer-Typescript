import { redis } from "@libs/RedisStore";
import { Socket } from "socket.io";
import IoInstance from "../libs/io";
import type {
  HandleFollowUserDataProps,
  HandleSeenProps,
  MessageErrorResponse,
  SocketUser,
} from "types/socket";
import MessageService from "./MessageService";
import ConversationService from "./ConversationService";
import _ from "lodash";
import FollowerService from "./FollowerService";
import query from "@utils/prisma";
import NotificationService from "./NotificationService";
import SaveMessageToDb from "./SaveMessageToDb";
import EmailService from "./EmailService";
import EmitActiveUsers from "@jobs/EmitActiveUsers";
import TriggerModels from "@jobs/Models";
import TriggerHookups from "@jobs/Hookup";
import ModelService from "./ModelService";
import HookupService from "./HookupService";

// --- Support Chat Handlers ---
// import SupportChatSession from "../models/SupportChatSession";
// import SupportMessage from "../models/SupportMessage";
// import SupportReview from "../models/SupportReview";

export default class SocketService {
  // Emit active users to a specific socket

  // Handle join room
  static async HandleJoinRoom(
    cb: (value: any) => void,
    socket: Socket,
    data: any,
  ) {
    cb(data);
    socket.join(data);
    socket.to(data).emit("joined", { message: "User Joined Room" });
  }

  // Handle message seen
  static async HandleMessageSeen(
    data: HandleSeenProps,
    socket: Socket,
    userRoom: string,
    _: any,
  ) {
    const lastMessageSeen = await MessageService.MessagesSeenByReceiver(data);
    if (lastMessageSeen.success) {
      socket.to(userRoom).emit("message-seen-updated", {
        messageId: lastMessageSeen.data?.message_id,
        seen: true,
      });
      await redis.del(`conversations:${data.userId}`);
      await redis.del(`conversations:${data.receiver_id}`);

      // Update unread count for the user who saw the message
      try {
        const ConversationService = (await import("./ConversationService"))
          .default;
        const unreadCountResult = await ConversationService.GetUnreadCount({
          user: { user_id: data.userId } as any,
        });

        if (!unreadCountResult.error && unreadCountResult.count !== undefined) {
          socket.emit("unread-count-updated", {
            unreadCount: unreadCountResult.count,
          });
        }
      } catch (error) {
        console.error(
          "❌ Error updating unread count after message seen:",
          error,
        );
      }

      // const conversations = await this.GetCachedConversations(data.userId);
      // const receiverConversations = await this.GetCachedConversations(data.receiver_id);
      // io.to(userRoom).emit("prefetch-conversations", "conversations");
      // socket.to(userRoom).emit("conversations", receiverConversations);
    }
  }

  // Handle typing
  // Emit typing event to other users in the room
  // Emit typing event to the sender
  static async HandleTyping(data: any, socket: Socket, userRoom: string) {
    socket.to(userRoom).emit("sender-typing", {
      value: true,
      sender_id: data.sender_id,
    });
  }

  // Handle check user is following
  // Emit check user is following event to the sender
  // Emit check user is following event to the receiver
  static async HandleCheckUserIsFollowing(
    data: { user_id: number; thisuser_id: number },
    socket: Socket,
  ) {
    const response = await FollowerService.CheckUserFollowing(
      data.user_id,
      data.thisuser_id,
    );
    if (response.status && "followId" in response) {
      socket.emit("isFollowing", {
        status: response.status,
        followID: response.followId || null,
      });
    }
  }

  // Handle follow user
  // Emit follow user event to the sender
  // Emit follow user event to the receiver
  static async HandleFollowUser(
    data: HandleFollowUserDataProps,
    socket: Socket,
  ) {
    const response = await FollowerService.FollowUser(
      data.user_id,
      data.profile_id,
      data.status,
      data.followId,
    );
    socket.emit("followed", {
      status: response.action === "followed",
      followID: response.followUuid,
    });
  }

  // Join upload room
  // Join upload room for file uploads
  static async JoinUploadRoom(socket: Socket, room: string) {
    socket.join(room);
    socket.emit("joined-upload-room", { message: "Joined Upload Room" });
  }

  // Handle post viewed
  // Emit post viewed event to the sender
  static async HandlePostViewed(data: { userId: number; postId: number }) {
    try {
      let canUpdate: boolean = false;
      await query.$transaction(async (prisma) => {
        const postViewed = await prisma.postImpression.findFirst({
          where: {
            post_id: data.postId,
            user_id: data.userId,
          },
        });
        if (!postViewed) {
          await prisma.postImpression.create({
            data: {
              post_id: data.postId,
              user_id: data.userId,
            },
          });
          canUpdate = true;
        }
        return;
      });
      if (!canUpdate) return;
      await query.post.update({
        where: {
          id: data.postId,
        },
        data: {
          post_impressions: {
            increment: 1,
          },
        },
      });
      return {
        status: true,
        message: "Post Viewed",
        postId: data.postId,
      };
    } catch (error) {
      console.log("Error in HandlePostViewed", error);
      throw new Error("Error in HandlePostViewed");
    }
  }

  // Handle notification join
  // Join notification room for user notifications
  static async HandleNotificationJoin(userId: string, socket: Socket) {
    socket.join(`notifications-${userId}`);
    const unreadNotifications =
      await NotificationService.GetUnreadNotifications(userId);
    socket.emit(`notifications-${userId}`, unreadNotifications);
  }

  // Handle conversations opened
  // Join conversations room for user conversations
  // static async HandleConversationsOpened(
  //   conversationId: string,
  //   socket: Socket
  // ) {
  //   socket.emit("prefetch-conversations", conversationId);
  // }
  // Save message to database

  // Handle New Message
  static async HandleMessage(
    data: any,
    socket: Socket,
    userRoom: string,
    user: SocketUser,
    io: any,
  ) {
    try {
      const messageResult = await SaveMessageToDb.SaveMessage(data);

      if (
        messageResult &&
        "success" in messageResult &&
        messageResult.success === false
      ) {
        // Handle specific error cases

        if (messageResult.error === "INSUFFICIENT_POINTS") {
          const errorResponse: MessageErrorResponse = {
            message: messageResult.message || "Insufficient points",
            error: "INSUFFICIENT_POINTS",
            currentPoints: messageResult.currentPoints,
            requiredPoints: messageResult.requiredPoints,
          };
          socket.emit("message-error", errorResponse);
        } else if (messageResult.error === "USERS_NOT_FOUND") {
          const errorResponse: MessageErrorResponse = {
            message: "User not found",
            error: "USERS_NOT_FOUND",
          };
          socket.emit("message-error", errorResponse);
        } else {
          const errorResponse: MessageErrorResponse = {
            message:
              messageResult.message ||
              "An error occurred while sending this message",
            error:
              (messageResult.error as MessageErrorResponse["error"]) ||
              "UNKNOWN_ERROR",
          };
          socket.emit("message-error", errorResponse);
        }
        return;
      }

      if (
        messageResult &&
        typeof messageResult === "object" &&
        !("success" in messageResult)
      ) {
        // Emit message without rawFiles (they're only for sender UI)
        const messageForReceiver = {
          ...data,
          rawFiles: [],
        };

        socket.to(userRoom).emit("message", messageForReceiver);

        //clear cached conversations
        const userMessageKey = `user:${user.userId}:conversations:${userRoom}`;
        const receiverMessageKey = `user:${data.receiver_id}:conversations:${userRoom}`;
        await redis.del(userMessageKey);
        await redis.del(receiverMessageKey);
        await redis.del(`conversations:${user.userId}`);
        await redis.del(`conversations:${data.receiver_id}`);

        // Emit prefetch event to both sender and receiver
        io.to(socket.id).emit("prefetch-conversations", "conversations");

        // Check If Receiver Is Active
        const allActiveUsers = await redis.hgetall("activeUsers");
        const targetUsername = messageResult.receiver.username;

        const foundStr = Object.values(allActiveUsers).find((str) => {
          const obj = JSON.parse(str);
          return obj.username === targetUsername;
        });

        const found = foundStr
          ? (JSON.parse(foundStr) as { username: string; socket_id: string })
          : undefined;

        // Send New Message If Receiver Is Not Active
        if (!found) {
          const name =
            messageResult.receiver.name.split(" ")[0] ??
            messageResult.receiver.name;
          const subject = `You've received a new message on PayMeFans!`;
          const link = `${process.env.APP_URL}/chats/${messageResult.conversationsId}`;
          await EmailService.SendNewMessageEmail({
            email: messageResult.receiver.email,
            name: name,
            subject,
            link,
          });
        } else {
          // If receiver is active, emit prefetch to them too
          io.to(found.socket_id).emit(
            "prefetch-conversations",
            "conversations",
          );

          // Emit real-time unread count update to the receiver
          try {
            const ConversationService = (await import("./ConversationService"))
              .default;
            const unreadCountResult = await ConversationService.GetUnreadCount({
              user: { user_id: data.receiver_id } as any,
            });

            if (
              !unreadCountResult.error &&
              unreadCountResult.count !== undefined
            ) {
              io.to(found.socket_id).emit("unread-count-updated", {
                unreadCount: unreadCountResult.count,
              });
            }
          } catch (error) {
            console.error("❌ Error updating unread count:", error);
          }
        }
      } else {
        console.error(
          "❌ SaveMessageToDb.SaveMessage returned unexpected result",
        );
        const errorResponse: MessageErrorResponse = {
          message: "An error occurred while sending this message",
          error: "UNKNOWN_ERROR",
        };
        socket.emit("message-error", errorResponse);
      }
    } catch (e) {
      console.error("❌ Error in HandleMessage:", e);
      const error = e as Error;
      console.error("🔍 Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      const errorResponse: MessageErrorResponse = {
        message: "An error occurred while sending this message",
        error: "SOCKET_ERROR",
      };
      socket.emit("message-error", errorResponse);
    }
  }

  // Handle user connected
  static async HandleUserConnected(
    socket: Socket,
    user: SocketUser,
    data: any,
  ) {
    user = {
      socketId: socket.id,
      username: data.username,
      userId: data.userId,
    };
    return user;
  }

  // Handle Reconnect To Rooms
  static async HandleReconnectToRooms(socket: Socket, userId: string) {
    const roomId = await redis.get(`user:${userId}:room`);
    if (roomId) {
      socket.join(roomId);
      const user = {
        socketId: socket.id,
        userId,
        username: "", // Optional: can pull from redis if needed
      };
      await redis.hset(`room:${roomId}`, userId, JSON.stringify(user));
    }
  }

  // Handle Restore Notifications
  static async HandleRestoreNotifications(socket: Socket, userId: string) {
    const notifications =
      await NotificationService.GetUnreadNotifications(userId);
    socket.join(`notifications-${userId}`);
    socket.emit(`notifications-${userId}`, notifications);
  }

  // Handle Still Active
  static async HandleStillActive(username: string, socket: Socket) {
    if (!username) return; // don't do anything if username is falsy

    try {
      const userKey = `user:${username}`;

      // Fetch user's show_active preference from database
      const user = await query.user.findFirst({
        where: { username },
        select: { show_active: true },
      });

      const userData = {
        username,
        socket_id: socket.id,
        last_active: Date.now(),
        show_active: user?.show_active ?? true, // Default to true if user not found
      };

      await redis.hset("activeUsers", userKey, JSON.stringify(userData));
      // Emit updated active users when someone updates their activity
      await EmitActiveUsers(IoInstance.getIO());
    } catch (error) {
      console.error("❌ Error in HandleStillActive:", error);
      // Fallback to basic user data if database query fails
      const userKey = `user:${username}`;
      const userData = {
        username,
        socket_id: socket.id,
        last_active: Date.now(),
        show_active: true, // Default fallback
      };
      await redis.hset("activeUsers", userKey, JSON.stringify(userData));
      await EmitActiveUsers(IoInstance.getIO());
    }
  }

  // Cached Conversations
  // Get cached conversations
  // If not found, fetch from database and cache it
  static async GetCachedConversations(userId: string) {
    let conversations = await redis.get(`conversations:${userId}`);
    if (!conversations) {
      const userConversations =
        await ConversationService.GetUserConversations(userId);
      redis.set(
        `conversations:${userId}`,
        JSON.stringify(userConversations),
        "EX",
        60,
      );
      return userConversations;
    }
    return JSON.parse(conversations);
  }

  // Handle user inactive status
  // Remove user from active users list
  // Emit updated active users list
  static async HandleUserInactive(username: string) {
    const userKey = `user:${username}`;
    await redis.hdel("activeUsers", userKey);
  }

  //  Handle user active status
  // Add user to active users list
  // Emit updated active users list
  static async HandleUserActive(username: string, socket: Socket) {
    try {
      const userKey = `user:${username}`;

      // Fetch user's show_active preference from database
      const user = await query.user.findFirst({
        where: { username },
        select: { show_active: true },
      });

      const userData = {
        username,
        socket_id: socket.id,
        last_active: Date.now(),
        show_active: user?.show_active ?? true, // Default to true if user not found
      };

      await redis.hdel("activeUsers", userKey);
      await redis.hset("activeUsers", userKey, JSON.stringify(userData));
    } catch (error) {
      console.error("❌ Error in HandleUserActive:", error);
    }
  }

  // Model & Hookup Pooling
  static async HandleModelHookupPooling(username: string): Promise<any> {
    TriggerModels();
    TriggerHookups(username);
  }

  // Send immediate models and hookups to a specific socket
  static async SendImmediateModelsAndHookups(
    socket: Socket,
    username: string,
  ): Promise<void> {
    try {
      console.log("Sending immediate data to", username);

      // Get models data directly
      const models = await ModelService.GetModels({ limit: 3 });

      // Send models immediately to this socket
      socket.emit("models-update", { models: models.models });

      // Get user data for location-based hookups
      const user = await query.user.findFirst({
        where: { username },
        select: {
          id: true,
          UserLocation: true,
        },
      });

      if (user) {
        const longitude = user.UserLocation?.longitude ?? 0;
        const latitude = user.UserLocation?.latitude ?? 0;

        const hookups = await HookupService.GetNearbyHookups(
          user,
          { latitude, longitude },
          6,
        );

        // Send hookups immediately to this socket
        socket.emit("hookup-update", { hookups: hookups.hookups });
      }
    } catch (error) {
      console.error("❌ Error sending immediate data to", username, ":", error);
      // Send empty data as fallback
      socket.emit("models-update", { models: [] });
      socket.emit("hookup-update", { hookups: [] });
    }
  }
}
