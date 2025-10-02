import type { SocketUser } from "types/socket";
import { redis } from "./RedisStore";
import SocketService from "@services/SocketService";
import EmitActiveUsers from "@jobs/EmitActiveUsers";

import GroupChatHandler from "./socket-handlers/GroupChatHandler";

// Periodic cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

async function AppSocket(io: any) {
  // Start periodic cleanup for orphaned group memberships
  const cleanupInterval = setInterval(async () => {
    try {
      await performPeriodicGroupCleanup(io);
    } catch (error) {
      console.error("Error in periodic group cleanup:", error);
    }
  }, CLEANUP_INTERVAL);

  // Store cleanup interval for potential cleanup on server shutdown
  process.on("SIGTERM", () => {
    clearInterval(cleanupInterval);
  });
  process.on("SIGINT", () => {
    clearInterval(cleanupInterval);
  });
  io.use((socket: any, next: (err?: Error) => void) => {
    const username = socket.handshake.query.username as string;
    if (!username || typeof username !== "string") {
      console.error("❌ Missing or invalid username:", socket.id);
      return next(new Error("Username is required"));
    }
    // Optional: Attach to socket for later use
    socket.username = username;
    next(); // ✅ allow connection
  });
  io.on("connection", (socket: any) => {
    const username = socket.username; // ← already validated and attached

    // Initialize user object with Redis storage
    const initializeUser = async (): Promise<SocketUser> => {
      const user: SocketUser = {
        socketId: socket.id,
        userId: "",
        username: username,
      };
      await SocketService.setUserForSocket(socket.id, user);
      return user;
    };

    const AddToUserRoom = async (data: any) => {
      await SocketService.setUserRoom(socket.id, data);
      const user = await SocketService.getUserFromSocket(socket.id);
      if (user && user.userId) {
        // Store mapping in Redis
        await redis.hset(`room:${data}`, user.userId, JSON.stringify(user));
        await redis.set(`user:${user.userId}:room`, data);
      }
    };

    console.log(
      "🔌 Socket connected:",
      username,
      "Socket ID:",
      socket.id,
      "Time:",
      new Date().toISOString(),
    );

    // Initialize user object and immediately emit active users
    initializeUser();
    SocketService.HandleUserActive(username, socket);

    socket.on("join", (data: string) =>
      SocketService.HandleJoinRoom(AddToUserRoom, socket, data),
    );
    socket.on("message-seen", async (data: any) => {
      const userRoom = await SocketService.getUserRoom(socket.id);
      if (userRoom) {
        SocketService.HandleMessageSeen(data, socket, userRoom, io);
      }
    });
    socket.on("typing", async (data: any) => {
      const userRoom = await SocketService.getUserRoom(socket.id);
      if (userRoom) {
        SocketService.HandleTyping(data, socket, userRoom);
      }
    });
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
    socket.on("user-connected", async (data: any) => {
      const user = await SocketService.getUserFromSocket(socket.id);
      if (user) {
        const updatedUser = {
          ...user,
          userId: data.userId.toString(),
        };
        await SocketService.setUserForSocket(socket.id, updatedUser);
        SocketService.HandleUserConnected(socket, updatedUser, data);
      }
    });
    socket.on("new-message", async (data: any) => {
      const userRoom =
        data.conversationId || (await SocketService.getUserRoom(socket.id));
      const user = await SocketService.getUserFromSocket(socket.id);
      if (user && userRoom) {
        SocketService.HandleMessage(data, socket, userRoom, user, io);
      }
    });
    socket.on("restoreRoom", (data: { userId: string }) => {
      SocketService.HandleReconnectToRooms(socket, data.userId);
    });
    socket.on("restoreNotifications", (data: { userId: string }) => {
      SocketService.HandleRestoreNotifications(socket, data.userId);
    });

    // Group chat event handlers
    socket.on("group-user-connected", async (data: any) => {
      const user = await SocketService.getUserFromSocket(socket.id);
      if (user) {
        const updatedUser = {
          ...user,
          userId: data.userId.toString(),
        };
        await SocketService.setUserForSocket(socket.id, updatedUser);
      }
    });

    socket.on(
      "join-group-room",
      async (data: { groupId: string; userId: string }) => {
        const user = await SocketService.getUserFromSocket(socket.id);
        if (user) {
          GroupChatHandler.handleJoinGroupRoom(socket, user, data);
        }
      },
    );

    socket.on(
      "leave-group-room",
      async (data: { groupId: string; userId: string }) => {
        const user = await SocketService.getUserFromSocket(socket.id);
        if (user) {
          GroupChatHandler.handleLeaveGroupRoom(socket, user, data, io);
        }
      },
    );

    socket.on("send-group-message", async (data: any) => {
      const user = await SocketService.getUserFromSocket(socket.id);
      if (!user?.userId) {
        console.error("User ID not set for group message");
        socket.emit("group-error", { message: "User not properly connected" });
        return;
      }
      GroupChatHandler.handleGroupMessage(socket, user, data, io);
    });

    socket.on(
      "group-typing",
      async (data: { groupId: string; isTyping: boolean }) => {
        const user = await SocketService.getUserFromSocket(socket.id);
        if (user) {
          GroupChatHandler.handleGroupTyping(socket, user, data, io);
        }
      },
    );

    socket.on(
      "group-message-seen",
      async (data: { groupId: string; messageId: number }) => {
        const user = await SocketService.getUserFromSocket(socket.id);
        if (user) {
          GroupChatHandler.handleGroupMessageSeen(socket, user, data);
        }
      },
    );

    socket.on("restore-group-rooms", (data: { userId: string }) => {
      if (!data || !data.userId) {
        console.error("Invalid data provided for restore-group-rooms");
        return;
      }
      GroupChatHandler.handleRestoreGroupRooms(socket, data.userId);
    });

    socket.on("leave-all-groups", async (data: { userId: string }) => {
      if (!data || !data.userId) {
        console.error("Invalid data provided for leave-all-groups");
        socket.emit("group-error", { message: "User ID is required" });
        return;
      }

      try {
        // Get all group rooms the user is in
        const userGroupKeys = await redis.keys(`group-rooms:${data.userId}`);
        let leftGroups = 0;

        for (const key of userGroupKeys) {
          const groupRooms = await redis.hgetall(key);

          for (const [groupId, roomName] of Object.entries(groupRooms)) {
            try {
              // Leave the socket room
              socket.leave(roomName);

              // Clean up user from group room with member left event
              await GroupChatHandler.cleanupGroupRoom(groupId, data.userId, io);
              leftGroups++;
            } catch (groupError) {
              console.error(
                `Error leaving group ${groupId} for user ${data.userId}:`,
                groupError,
              );
            }
          }

          // Clean up the user's group rooms mapping
          await redis.del(key);
        }

        // Emit confirmation
        socket.emit("left-all-groups", {
          userId: data.userId,
          groupsLeft: leftGroups,
          message: `Successfully left ${leftGroups} groups`,
        });
      } catch (error) {
        console.error("Error leaving all groups:", error);
        socket.emit("group-error", {
          message: "Failed to leave all groups",
        });
      }
    });

    socket.on("group-active-members", async (data: { groupId: string }) => {
      const activeMembers = await GroupChatHandler.getActiveGroupMembers(
        data.groupId,
      );
      socket.emit("group-active-members", {
        groupId: data.groupId,
        members: activeMembers,
      });
    });

    socket.on(
      "group-heartbeat",
      async (data: { groupId: string; userId: string }) => {
        if (!data.groupId || !data.userId) {
          return;
        }

        try {
          // Update user's last seen timestamp in the group
          const memberKey = `group-members:${data.groupId}`;
          const userDataStr = await redis.hget(memberKey, data.userId);

          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            userData.lastSeen = new Date().toISOString();
            await redis.hset(memberKey, data.userId, JSON.stringify(userData));
          }
        } catch (error) {
          console.error("Error updating group heartbeat:", error);
        }
      },
    );

    socket.on("disconnect", async (reason: any) => {
      // Get user data before cleanup
      const user = await SocketService.getUserFromSocket(socket.id);
      console.log(`🔌 Client disconnected: ${socket.id} | Reason: ${reason}`);

      // Remove user from Redis active users
      const userKey = `user:${user?.username || username}`;
      await redis.hdel("activeUsers", userKey);

      // Clean up user from all group rooms
      if (user?.userId) {
        try {
          // Get all group rooms the user was in
          const userGroupKeys = await redis.keys(`group-rooms:${user.userId}`);

          for (const key of userGroupKeys) {
            const groupRooms = await redis.hgetall(key);

            for (const [groupId, roomName] of Object.entries(groupRooms)) {
              try {
                // Leave the socket room
                socket.leave(roomName);

                // Clean up user from group room
                await GroupChatHandler.cleanupGroupRoom(
                  groupId,
                  user.userId,
                  io,
                );
              } catch (groupError) {
                console.error(
                  `Error cleaning up group ${groupId} for user ${user.userId}:`,
                  groupError,
                );
              }
            }

            // Clean up the user's group rooms mapping
            await redis.del(key);
          }
        } catch (error) {
          console.error("Error cleaning up group rooms on disconnect:", error);
        }
      }

      // Clean up socket state from Redis
      await SocketService.removeSocketState(socket.id);

      // Handle user inactive status
      try {
        await SocketService.HandleUserInactive(
          user?.username ||
            username ||
            (socket.handshake.query.username as string),
        );
        EmitActiveUsers(io);
      } catch (error) {
        console.error("Error handling user inactive on disconnect:", error);
      }
    });
  });
}

/**
 * Periodic cleanup function to remove orphaned group memberships
 * This handles cases where Redis entries might be left behind due to unexpected disconnections
 */
async function performPeriodicGroupCleanup(io: any) {
  try {
    // Get all group member keys
    const groupMemberKeys = await redis.keys("group-members:*");

    for (const key of groupMemberKeys) {
      const groupId = key.replace("group-members:", "");
      const members = await redis.hgetall(key);

      for (const [userId, memberDataStr] of Object.entries(members)) {
        try {
          const memberData = JSON.parse(memberDataStr);
          const joinedAt = new Date(memberData.joinedAt);
          const now = new Date();
          const timeDiff = now.getTime() - joinedAt.getTime();

          // If user has been "active" for more than 1 hour without recent activity, check if they're really connected
          if (timeDiff > 60 * 60 * 1000) {
            // Check if user still has active socket connections
            const userGroupRooms = await redis.hgetall(`group-rooms:${userId}`);

            // If no group rooms found for this user, they're likely disconnected
            if (Object.keys(userGroupRooms).length === 0) {
              // Clean up the orphaned membership
              await GroupChatHandler.cleanupGroupRoom(groupId, userId, io);
            }
          }
        } catch (memberError) {
          console.error(
            `Error processing member ${userId} in group ${groupId}:`,
            memberError,
          );
          // Remove corrupted member data
          await redis.hdel(key, userId);
        }
      }
    }
  } catch (error) {
    console.error("Error in periodic group cleanup:", error);
  }
}

export default AppSocket;
