import type { SocketUser } from "types/socket";
import { redis } from "./RedisStore";
import SocketService from "@services/SocketService";
import EmitActiveUsers from "@jobs/EmitActiveUsers";
import HandleLocationUpdate from "./socket-handlers/LocationHandler";

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
    });
  });
}

export default AppSocket;
