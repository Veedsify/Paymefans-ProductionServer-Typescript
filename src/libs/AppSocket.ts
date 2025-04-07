import type { SocketUser } from "types/socket";
import { redis } from "./RedisStore";
import SocketService from "@services/SocketService";

async function AppSocket(io: any) {
  io.on("connection", (socket: any) => {
    let userRoom = "";

    let user: SocketUser = {
      socketId: socket.id,
      userId: "",
      username: "",
    };

    const AddToUserRoom = async (data: any) => {
      userRoom = data;

      // Store mapping in Redis
      await redis.hset(`room:${data}`, user.userId, JSON.stringify(user));
      await redis.set(`user:${user.userId}:room`, data);
    };

    // Socket Actions
    socket.on("user_active", (username: string) =>
      SocketService.HandleUserActive(username, socket)
    );
    socket.on("join", (data: string) =>
      SocketService.HandleJoinRoom(AddToUserRoom, socket, data)
    );
    socket.on("message-seen", (data: any) =>
      SocketService.HandleMessageSeen(data, socket, userRoom, io)
    );
    socket.on("typing", (data: any) =>
      SocketService.HandleTyping(data, socket, userRoom)
    );
    socket.on("checkUserIsFollowing", (data: any) =>
      SocketService.HandleCheckUserIsFollowing(data, socket)
    );
    socket.on("followUser", (data: any) =>
      SocketService.HandleFollowUser(data, socket)
    );
    socket.on("join-upload-room", (data: any) =>
      SocketService.JoinUploadRoom(socket, data)
    );
    socket.on("post-viewed", (data: any) =>
      SocketService.HandlePostViewed(data)
    );
    socket.on("notifications-join", (userId: string) =>
      SocketService.HandleNotificationJoin(userId, socket)
    );
    socket.on("conversations-opened", (conversationId: string) =>
      SocketService.HandleConversationsOpened(conversationId, socket)
    );
    socket.on("user-connected", (data: any) =>
      SocketService.HandleUserConnected(socket, user, data)
    );
    socket.on("new-message", (data: any) => {
      SocketService.HandleMessage(data, socket, userRoom, user, io);
    });
    socket.on("restoreRoom", (data: { userId: string }) => {
      SocketService.HandleReconnectToRooms(socket, data.userId);
    });
    socket.on("restoreNotifications", (data: { userId: string }) => {
      SocketService.HandleRestoreNotifications(socket, data.userId);
    });

    // socket.on("new-message", handleMessage);
    socket.on("disconnect", async () => {
      // invalidate conversations cache
      await redis.del(`conversations:${user.userId}`);
      await SocketService.HandleUserInactive(user.userId);
    });
  });
}

export default AppSocket;
