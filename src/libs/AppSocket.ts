import type { SocketUser } from "types/socket";
import { redis } from "./RedisStore";
import SocketService from "@services/SocketService";
import EmitActiveUsers from "@jobs/EmitActiveUsers";
import query from "@utils/prisma";

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

    const username = socket.handshake.query.username as string;
    if (!username) {
      console.error("No username provided in socket connection");
      return;
    }

    if (username.startsWith("support-agent-")) {
      socket.join("support-agents");
      console.log(`Support agent ${username} joined the support-agents room.`);
    }

    console.log("🔌 Socket connected:", username, "Socket ID:", socket.id);

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
    socket.on("user-connected", (data: any) =>
      SocketService.HandleUserConnected(socket, user, data),
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

    // --- Support Chat Events ---
    socket.on("support:start", (data: any) =>
      SocketService.HandleSupportStart(data, socket, io),
    );
    socket.on("support:message", (data: any) =>
      SocketService.HandleSupportMessage(data, socket, io),
    );
    socket.on(
      "support:join",
      async (data: { sessionId: string; agentId: string }) => {
        try {
          const session = await SocketService.HandleSupportJoin(
            data,
            socket,
            io,
          );
          if (session && session.agentId) {
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

              // Emit to the specific session room
              io.to(data.sessionId).emit("support:agent-joined", agentData);

              // Also emit to support agents room
              io.to("support-agents").emit("support:agent-joined", agentData);
            }
          }
        } catch (error) {
          console.error("Error handling support join:", error);
          socket.emit("support:error", {
            message: "Failed to join support session.",
          });
        }
      },
    );
    socket.on("support:leave", (data: any) =>
      SocketService.HandleSupportLeave(data, socket, io),
    );
    socket.on("support:end", (data: any) =>
      SocketService.HandleSupportEnd(data, socket, io),
    );
    socket.on("support:push", (data: any) =>
      SocketService.HandleSupportPush(data, socket, io),
    );
    socket.on("support:review", (data: any) =>
      SocketService.HandleSupportReview(data, socket, io),
    );
    socket.on("support:waiting-list", () =>
      SocketService.HandleSupportWaitingList(socket),
    );
    socket.on("support:message-history", (data: any) =>
      SocketService.HandleSupportMessageHistory(data, socket),
    );
    socket.on(
      "support:typing",
      (data: { sessionId: string; isTyping: boolean }) => {
        // User is typing, send to agents
        socket
          .to(data.sessionId)
          .emit("support:typing", { isTyping: data.isTyping });
      },
    );
    socket.on(
      "support:agent-typing",
      (data: { sessionId: string; isTyping: boolean }) => {
        // Agent is typing, send to user
        socket
          .to(data.sessionId)
          .emit("support:agent-typing", { isTyping: data.isTyping });
      },
    );

    // socket.on("new-message", handleMessage);
    socket.on("disconnect", async () => {
      console.log("🔌 Socket disconnected:", username, "Socket ID:", socket.id);
      // invalidate conversations cache
      await redis.del(`conversations:${user.userId}`);
      // Use username for disconnect since user.userId might not be set
      await SocketService.HandleUserInactive(username);
      // Emit updated active users list after disconnect
      await EmitActiveUsers(io);
    });
  });
}

export default AppSocket;
