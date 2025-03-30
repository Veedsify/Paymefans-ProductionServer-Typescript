import { redis } from "@libs/RedisStore";
import { Socket } from "socket.io";
import IoInstance from "../libs/io";
import { HandleFollowUserDataProps, HandleSeenProps } from "types/socket";
import MessageService from "./MessageService";
import ConversationService from "./ConversationService";
import _ from "lodash";
import FollowerService from "./FollowerService";
import query from "@utils/prisma";
import NotificationService from "./NotificationService";
export default class SocketService {
      // Emit active users
      // Get active users from redis
      // Emit active users to all connected clients
      static async EmitActiveUsers() {
            const io = await IoInstance.getIO();
            const activeUsers = await redis.hgetall("activeUsers");
            io.emit(
                  "active_users",
                  Object.values(activeUsers).map((value) =>
                        JSON.parse(value)
                  )
            );
      }
      // Cached Conversations
      // Get cached conversations
      // If not found, fetch from database and cache it
      static async GetCachedConversations(userId: string) {
            let conversations = await redis.get(`conversations:${userId}`);
            if (!conversations) {
                  const userConversations = await ConversationService.GetUserConversations(userId);
                  redis.set(
                        `conversations:${userId}`,
                        JSON.stringify(userConversations),
                        "EX",
                        60
                  );
                  return userConversations;
            }
            return JSON.parse(conversations);
      };
      // Handle user inactive status
      // Remove user from active users list
      // Emit updated active users list
      static async HandleUserInactive(
            username: string,
      ) {
            const userKey = `user:${username}`;
            await redis.hdel("activeUsers", userKey);
            this.EmitActiveUsers();
      }
      //  Handle user active status
      // Add user to active users list
      // Emit updated active users list
      static async HandleUserActive(
            username: string,
            socket: Socket,
      ) {
            const userKey = `user:${username}`;
            const userData = {
                  username,
                  socket_id: socket.id,
            };
            await redis.hset("activeUsers", userKey, JSON.stringify(userData));
            this.EmitActiveUsers();
      }
      // Handle join room
      static async HandleJoinRoom(cb: (value: any) => void, socket: Socket, data: any) {
            cb(data);
            socket.join(data);
            socket.to(data).emit("joined", { message: "User Joined Room" });
      }
      // Handle message seen
      static async HandleMessageSeen(data: HandleSeenProps, socket: Socket, userRoom: string) {
            const lastMessageSeen = await MessageService.MessagesSeenByReceiver(data);
            if (lastMessageSeen.success) {
                  socket.to(userRoom).emit("message-seen-updated", {
                        messageId: lastMessageSeen.data?.message_id,
                        seen: true,
                  });
                  await redis.del(`conversations:${data.userId}`);
                  await redis.del(`conversations:${data.receiver_id}`);
                  const conversations = await this.GetCachedConversations(data.userId);
                  const receiverConversations = await this.GetCachedConversations(data.receiver_id);
                  socket.emit("conversations", conversations);
                  socket.to(userRoom).emit("conversations", receiverConversations);
            }
      };
      // Handle typing
      // Emit typing event to other users in the room
      // Emit typing event to the sender
      static async HandleTyping(data: any, socket: Socket, userRoom: string) {
            socket.to(userRoom).emit("sender-typing", {
                  value: data.value,
                  sender_id: data.sender_id,
            });
      };
      // Handle check user is following
      // Emit check user is following event to the sender
      // Emit check user is following event to the receiver
      static async HandleCheckUserIsFollowing(data: { user_id: number; thisuser_id: number }, socket: Socket) {
            const response = await FollowerService.CheckUserFollowing(data.user_id, data.thisuser_id)
            if (response.status && 'followId' in response) {
                  socket.emit("isFollowing", {
                        status: response.status,
                        followID: response.followId || null,
                  });
            }
      }
      // Handle follow user
      // Emit follow user event to the sender
      // Emit follow user event to the receiver
      static async HandleFollowUser(data: HandleFollowUserDataProps, socket: Socket) {
            const response = await FollowerService.FollowUser(
                  data.user_id,
                  data.profile_id,
                  data.status,
                  data.followId
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
      static async HandlePostViewed(data: { userId: number, postId: number }) {
            try {
                  let canUpdate: boolean = false;
                  await query.$transaction(async (prisma) => {
                        const postViewed = await prisma.postImpression.findFirst({
                              where: {
                                    post_id: data.postId,
                                    user_id: data.userId
                              }
                        })
                        if (!postViewed) {
                              await prisma.postImpression.create({
                                    data: {
                                          post_id: data.postId,
                                          user_id: data.userId
                                    }
                              })
                              canUpdate = true
                        }     
                        return
                  })
                  if (!canUpdate) return
                  await query.post.update({
                        where: {
                              id: data.postId
                        },
                        data: {
                              post_impressions: {
                                    increment: 1
                              }
                        }
                  })
                  return {
                        status: true,
                        message: "Post Viewed",
                        postId: data.postId
                  }
            } catch (error) {
                  console.log("Error in HandlePostViewed", error)
                  throw new Error("Error in HandlePostViewed");
            }
      }
      // Handle notification join
      // Join notification room for user notifications
      static async HandleNotificationJoin(userId: string, socket: Socket) {
            socket.join(`notifications-${userId}`);
            const unreadNotifications = await NotificationService.GetUnreadNotifications(userId);
            console.log("Unread Notifications", unreadNotifications);
            socket.emit(`notifications-${userId}`, unreadNotifications);
      }
}
