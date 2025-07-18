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

// --- Support Chat Handlers ---
import SupportChatSession from "../models/SupportChatSession";
import SupportMessage from "../models/SupportMessage";
import SupportReview from "../models/SupportReview";

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
      console.log("🚀 HandleMessage called with data:", {
        message_id: data.message_id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        conversationId: data.conversationId,
        userRoom,
        socketId: socket.id,
      });

      const messageResult = await SaveMessageToDb.SaveMessage(data);
      if (
        messageResult &&
        typeof messageResult === "object" &&
        "success" in messageResult &&
        !messageResult.success
      ) {
        // Handle specific error cases
        console.error("❌ SaveMessageToDb error:", messageResult);

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
        // This is a successful message object
        console.log("✅ Message saved successfully, emitting to receiver");

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

  // --- Support Chat Handlers ---
  // User starts a support chat session
  static async HandleSupportStart(
    data: { userId: string },
    socket: Socket,
    io: any,
  ) {
    try {
      console.log("🚀 User starting support session:", data);

      // Check if user already has an active session
      let session = await SupportChatSession.findOne({
        userId: data.userId,
        status: { $in: ["waiting", "active"] },
      });

      if (!session) {
        session = await SupportChatSession.create({
          userId: data.userId,
          status: "waiting",
        });
        console.log("📋 Created new session:", session._id.toString());
      } else {
        console.log("📋 Found existing session:", session._id.toString());
      }

      // Join the session room
      socket.join(session._id.toString());
      console.log("🏠 User joined session room:", session._id.toString());

      // Store session info in socket for reference
      socket.supportSessionId = session._id.toString();

      // Notify agents about waiting list update
      io.emit("support:waiting-list-update");
      io.to("support-agents").emit("support:waiting-list-update");
      console.log("📋 Notified agents about waiting list update");

      // Send session info to user
      socket.emit("support:session-started", session);
      console.log("✅ Sent session info to user");

      // Send existing messages if any
      const messages = await SupportMessage.find({
        sessionId: session._id.toString(),
      });
      socket.emit("support:message-history", messages);
      console.log("📜 Sent message history to user, count:", messages.length);

      // If session already has an agent, send agent info
      if (session.agentId) {
        const agent = await query.user.findFirst({
          where: { id: parseInt(session.agentId, 10) },
          select: {
            fullname: true,
            profile_image: true,
          },
        });

        if (agent) {
          const agentData = {
            id: session.agentId,
            name: `${agent.fullname}`,
            avatar: agent.profile_image,
            role: "Support Specialist",
            status: "online",
            rating: 5,
          };
          socket.emit("support:agent-joined", agentData);
          console.log("👤 Sent existing agent info to user:", agentData.name);
        }
      }
    } catch (error) {
      console.error("Error starting support session:", error);
      socket.emit("support:error", {
        message: "Failed to start support session",
      });
    }
  }

  // User or agent sends a message
  static async HandleSupportMessage(
    data: {
      sessionId: string;
      sender: "user" | "agent";
      senderId: string;
      message: string;
    },
    socket: Socket,
    io: any,
  ) {
    try {
      console.log("📨 Handling support message:", data);

      const msg = await SupportMessage.create({
        ...data,
        createdAt: new Date(),
      });

      console.log("💾 Message saved to DB:", msg);

      // Get all sockets in the session room
      const room = io.sockets.adapter.rooms.get(data.sessionId);
      console.log(
        "👥 Sockets in room",
        data.sessionId,
        ":",
        room ? Array.from(room) : "none",
      );

      // Emit to all users in the session room
      io.to(data.sessionId).emit("support:message", msg);
      console.log("🔔 Emitted message to session room:", data.sessionId);

      // Also emit to support agents room for notifications
      if (data.sender === "user") {
        io.to("support-agents").emit("support:message", msg);
        console.log("🔔 Emitted message to support-agents room");
      }

      // Confirm message was sent to sender
      socket.emit("support:message-sent", msg);
      console.log("✅ Sent confirmation to sender");
    } catch (error) {
      console.error("Error sending support message:", error);
      socket.emit("support:error", { message: "Failed to send message" });
    }
  }

  // Agent joins a session
  static async HandleSupportJoin(
    data: { sessionId: string; agentId: string },
    socket: Socket,
    io: any,
  ) {
    try {
      console.log("👤 Agent joining session:", data);

      const session = await SupportChatSession.findByIdAndUpdate(
        data.sessionId,
        { agentId: data.agentId, status: "active" },
        { new: true },
      );

      if (!session) {
        console.error("❌ Session not found:", data.sessionId);
        socket.emit("support:error", { message: "Session not found" });
        return null;
      }

      // Join the session room
      socket.join(data.sessionId);
      console.log("🏠 Agent joined session room:", data.sessionId);

      // Store session info in socket for reference
      socket.supportSessionId = data.sessionId;

      // Notify about waiting list update
      io.emit("support:waiting-list-update");
      console.log("📋 Notified waiting list update");

      // Send message history to the agent
      const messages = await SupportMessage.find({ sessionId: data.sessionId });
      socket.emit("support:message-history", messages);
      console.log("📜 Sent message history to agent, count:", messages.length);

      // Return session for further processing
      return session;
    } catch (error) {
      console.error("Error joining support session:", error);
      socket.emit("support:error", { message: "Failed to join session" });
      return null;
    }
  }

  // Agent leaves a session
  static async HandleSupportLeave(
    data: { sessionId: string; agentId: string },
    socket: Socket,
    io: any,
  ) {
    try {
      const session = await SupportChatSession.findByIdAndUpdate(
        data.sessionId,
        { agentId: null, status: "waiting" },
        { new: true },
      );

      if (!session) {
        socket.emit("support:error", { message: "Session not found" });
        return;
      }

      // Leave the session room
      socket.leave(data.sessionId);

      // Clear session info from socket
      delete socket.supportSessionId;

      // Notify about waiting list update
      io.emit("support:waiting-list-update");

      // Notify users in the session that agent left
      io.to(data.sessionId).emit("support:agent-left", {
        agentId: data.agentId,
      });
    } catch (error) {
      console.error("Error leaving support session:", error);
      socket.emit("support:error", { message: "Failed to leave session" });
    }
  }

  // End a session (user or agent)
  static async HandleSupportEnd(
    data: { sessionId: string },
    socket: Socket,
    io: any,
  ) {
    try {
      const session = await SupportChatSession.findByIdAndUpdate(
        data.sessionId,
        { status: "ended", endedAt: new Date() },
        { new: true },
      );

      if (!session) {
        socket.emit("support:error", { message: "Session not found" });
        return;
      }

      // Notify about waiting list update
      io.emit("support:waiting-list-update");

      // Notify all users in the session that it ended
      io.to(data.sessionId).emit("support:session-ended", {
        sessionId: data.sessionId,
      });

      // Remove all sockets from the session room
      const room = io.sockets.adapter.rooms.get(data.sessionId);
      if (room) {
        room.forEach((socketId: string) => {
          const socketInRoom = io.sockets.sockets.get(socketId);
          if (socketInRoom) {
            socketInRoom.leave(data.sessionId);
            delete socketInRoom.supportSessionId;
          }
        });
      }
    } catch (error) {
      console.error("Error ending support session:", error);
      socket.emit("support:error", { message: "Failed to end session" });
    }
  }

  // Push session to another agent
  static async HandleSupportPush(
    data: { sessionId: string; agentId: string },
    _socket: Socket,
    io: any,
  ) {
    const _session = await SupportChatSession.findByIdAndUpdate(
      data.sessionId,
      { pushedToAgentId: data.agentId },
      { new: true },
    );
    io.to(data.sessionId).emit("support:session-pushed", {
      agentId: data.agentId,
    });
  }

  // User submits a review
  static async HandleSupportReview(
    data: {
      sessionId: string;
      userId: string;
      rating: number;
      comment?: string;
    },
    _socket: Socket,
    io: any,
  ) {
    const review = await SupportReview.create(data);
    await SupportChatSession.findByIdAndUpdate(data.sessionId, {
      reviewId: review._id,
    });
    io.to(data.sessionId).emit("support:review-submitted", review);
  }

  // Agent requests waiting list
  static async HandleSupportWaitingList(socket: Socket) {
    try {
      const waiting = await SupportChatSession.find({ status: "waiting" }).sort(
        { startedAt: 1 },
      );
      socket.emit("support:waiting-list", waiting);
    } catch (error) {
      console.error("Error fetching waiting list:", error);
      socket.emit("support:error", { message: "Failed to fetch waiting list" });
    }
  }

  // Handle message history request
  static async HandleSupportMessageHistory(
    data: { sessionId: string },
    socket: Socket,
  ) {
    try {
      const messages = await SupportMessage.find({
        sessionId: data.sessionId,
      }).sort({ createdAt: 1 });
      socket.emit("support:message-history", messages);
    } catch (error) {
      console.error("Error fetching message history:", error);
      socket.emit("support:error", {
        message: "Failed to fetch message history",
      });
    }
  }
}
