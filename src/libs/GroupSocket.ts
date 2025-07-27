import type { SocketUser } from "types/socket";
import GroupChatHandler from "./socket-handlers/GroupChatHandler";

async function GroupSocket(io: any) {
  io.on("connection", (socket: any) => {
    const username = socket.handshake.query.username as string;

    let user: SocketUser = {
      socketId: socket.id,
      userId: "",
      username: username,
    };

    if (!username) {
      console.error("No username provided in group socket connection");
      return;
    }

    console.log(
      "🔌 Group Socket connected:",
      username,
      "Socket ID:",
      socket.id,
      "Time:",
      new Date().toISOString(),
    );

    // Group chat event handlers
    socket.on("group-user-connected", (data: any) => {
      user = {
        ...user,
        userId: data.userId,
      };
      console.log(`Group user connected: ${user.username} (${user.userId})`);
    });

    // Join a group chat room
    socket.on("join-group-room", (data: { groupId: string; userId: string }) => {
      GroupChatHandler.handleJoinGroupRoom(socket, user, data);
    });

    // Leave a group chat room
    socket.on("leave-group-room", (data: { groupId: string; userId: string }) => {
      GroupChatHandler.handleLeaveGroupRoom(socket, user, data);
    });

    // Send message to group
    socket.on("send-group-message", (data: any) => {
      GroupChatHandler.handleGroupMessage(socket, user, data, io);
    });

    // Handle typing indicator in group
    socket.on("group-typing", (data: { groupId: string; isTyping: boolean }) => {
      GroupChatHandler.handleGroupTyping(socket, user, data);
    });

    // Handle message seen in group
    socket.on("group-message-seen", (data: { groupId: string; messageId: number }) => {
      GroupChatHandler.handleGroupMessageSeen(socket, user, data);
    });

    // Restore group rooms on reconnection
    socket.on("restore-group-rooms", (data: { userId: string }) => {
      GroupChatHandler.handleRestoreGroupRooms(socket, data.userId);
    });

    // Get active members in a group
    socket.on("get-group-active-members", async (data: { groupId: string }) => {
      const activeMembers = await GroupChatHandler.getActiveGroupMembers(data.groupId);
      socket.emit("group-active-members", {
        groupId: data.groupId,
        members: activeMembers,
      });
    });

    socket.on("disconnect", async (reason: any) => {
      console.log(
        "🔌 Group Socket disconnected:",
        username,
        "Socket ID:",
        socket.id,
        "Reason:",
        reason,
        "Time:",
        new Date().toISOString(),
      );

      // Clean up user from all group rooms
      if (user.userId) {
        try {
          // Get user's group memberships and clean up
          const userGroupKeys = await import("../RedisStore").then(module =>
            module.redis.keys(`group-rooms:${user.userId}`)
          );

          for (const key of userGroupKeys) {
            const groupRooms = await import("../RedisStore").then(module =>
              module.redis.hgetall(key)
            );

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

export default GroupSocket;
