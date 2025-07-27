import type { SocketUser } from "types/socket";
import { redis } from "./RedisStore";
import SocketService from "@services/SocketService";
import EmitActiveUsers from "@jobs/EmitActiveUsers";
import HandleLocationUpdate from "./socket-handlers/LocationHandler";
import GroupChatHandler from "./socket-handlers/GroupChatHandler";

async function AppSocket(io: any) {
  io.on("connection", (socket: any) => {
    let userRoom = "";
    const username = socket.handshake.query.username as string;

    let user: SocketUser = {
      socketId: socket.id,
      userId: "",
      username: username,
    };

    const AddToUserRoom = async (data: any) => {
      userRoom = data;
      // Store mapping in Redis
      await redis.hset(`room:${data}`, user.userId, JSON.stringify(user));
      await redis.set(`user:${user.userId}:room`, data);
    };

    if (!username) {
      console.error("No username provided in socket connection");
      return;
    }

    console.log(
      "🔌 Socket connected:",
      username,
      "Socket ID:",
      socket.id,
      "Time:",
      new Date().toISOString(),
    );

    // Initialize user object and immediately emit active users
    SocketService.HandleUserActive(username, socket);

    socket.on("join", (data: string) =>
      SocketService.HandleJoinRoom(AddToUserRoom, socket, data),
    );
    socket.on("message-seen", (data: any) =>
      SocketService.HandleMessageSeen(data, socket, userRoom, io),
    );
    socket.on("typing", (data: any) =>
      SocketService.HandleTyping(data, socket, userRoom),
    );
    socket.on("checkUserIsFollowing", (data: any) =>
      SocketService.HandleCheckUserIsFollowing(data, socket),
    );
    socket.on("followUser", (data: any) =>
      SocketService.HandleFollowUser(data, socket),
    );
    socket.on("join-upload-room", (data: any) =>
      SocketService.JoinUploadRoom(socket, data),
    );
    socket.on("post-viewed", (data: any) =>
      SocketService.HandlePostViewed(data),
    );
    socket.on("notifications-join", (userId: string) =>
      SocketService.HandleNotificationJoin(userId, socket),
    );
    socket.on("still-active", (username: string) =>
      SocketService.HandleStillActive(username, socket),
    );
    socket.on("inactive", (username: string) =>
      SocketService.HandleUserInactive(
        username || (socket.handshake.query.username as string),
      ).then(() => {
        EmitActiveUsers(io);
      }),
    );
    socket.on("get-active-users", () => EmitActiveUsers(io));
    socket.on("user-connected", (data: any) => {
      user = {
        ...user,
        userId: data.userId,
      };
      return SocketService.HandleUserConnected(socket, user, data);
    });
    socket.on("new-message", (data: any) => {
      SocketService.HandleMessage(data, socket, userRoom, user, io);
    });
    socket.on("restoreRoom", (data: { userId: string }) => {
      SocketService.HandleReconnectToRooms(socket, data.userId);
    });
    socket.on("restoreNotifications", (data: { userId: string }) => {
      SocketService.HandleRestoreNotifications(socket, data.userId);
    });

    // Handle location updates for hookup feature
    socket.on(
      "user-location",
      (data: { latitude: number; longitude: number }) => {
        if (user && username) {
          HandleLocationUpdate(socket, data, username);
        }
      },
    );

    // Model & Hookup Pooling
    socket.on("pool-models-and-hookup", () =>
      SocketService.HandleModelHookupPooling(username),
    );

    // Group chat event handlers
    socket.on("group-user-connected", (data: any) => {
      user = {
        ...user,
        userId: data.userId,
      };
    });

    socket.on(
      "join-group-room",
      (data: { groupId: string; userId: string }) => {
        GroupChatHandler.handleJoinGroupRoom(socket, user, data);
      },
    );

    socket.on(
      "leave-group-room",
      (data: { groupId: string; userId: string }) => {
        GroupChatHandler.handleLeaveGroupRoom(socket, user, data);
      },
    );

    socket.on("send-group-message", (data: any) => {
      GroupChatHandler.handleGroupMessage(socket, user, data, io);
    });

    socket.on(
      "group-typing",
      (data: { groupId: string; isTyping: boolean }) => {
        GroupChatHandler.handleGroupTyping(socket, user, data);
      },
    );

    socket.on(
      "group-message-seen",
      (data: { groupId: string; messageId: number }) => {
        GroupChatHandler.handleGroupMessageSeen(socket, user, data);
      },
    );

    socket.on("restore-group-rooms", (data: { userId: string }) => {
      GroupChatHandler.handleRestoreGroupRooms(socket, data.userId);
    });

    socket.on("get-group-active-members", async (data: { groupId: string }) => {
      const activeMembers = await GroupChatHandler.getActiveGroupMembers(
        data.groupId,
      );
      socket.emit("group-active-members", {
        groupId: data.groupId,
        members: activeMembers,
      });
    });

    socket.on("disconnect", async (reason: any) => {
      console.log(
        "🔌 Socket disconnected:",
        username,
        "Socket ID:",
        socket.id,
        "Reason:",
        reason,
        "Time:",
        new Date().toISOString(),
      );

      // Remove user from Redis
      const userKey = `user:${user.username}`;
      await redis.hdel("activeUsers", userKey);

      // Clean up user from all group rooms
      if (user.userId) {
        try {
          const userGroupKeys = await redis.keys(`group-rooms:${user.userId}`);

          for (const key of userGroupKeys) {
            const groupRooms = await redis.hgetall(key);

            for (const [groupId] of Object.entries(groupRooms)) {
              await GroupChatHandler.cleanupGroupRoom(groupId, user.userId);
            }
          }
        } catch (error) {
          console.error("Error cleaning up group rooms on disconnect:", error);
        }
      }
    });
  });
}

export default AppSocket;
