import {SocketUser} from "types/socket";
import {redis} from "./RedisStore";
import SocketService from "@services/SocketService";

let appSocket: any;

async function AppSocket(io: any) {
    io.on("connection", (socket: any) => {
        appSocket = socket;
        let userRoom = "";

        let user: SocketUser = {
            userId: "",
            username: "",
        };


        const AddToUserRoom = (data: any) => {
            userRoom = data
        }

        // Socket Actions
        socket.on("user_active", (username: string) => SocketService.HandleUserActive(username, socket));
        socket.on("join", (data: string) => SocketService.HandleJoinRoom(AddToUserRoom, socket, data));
        socket.on("message-seen", (data: any) => SocketService.HandleMessageSeen(data, socket, userRoom));
        socket.on("typing", (data: any) => SocketService.HandleTyping(data, socket, userRoom));
        socket.on("checkUserIsFollowing", (data: any) => SocketService.HandleCheckUserIsFollowing(data, socket));
        socket.on("followUser", (data: any) => SocketService.HandleFollowUser(data, socket));
        socket.on("join-upload-room", (data: any) => SocketService.JoinUploadRoom(socket, data));
        socket.on("post-viewed", (data: any) => SocketService.HandlePostViewed(data));
        socket.on("notifications-join", (userId: string) => SocketService.HandleNotificationJoin(userId, socket));
        // socket.on("new-message", handleMessage);
        socket.on("disconnect", async () => {
            // invalidate conversations cache
            await redis.del(`conversations:${user.userId}`);
            await SocketService.HandleUserInactive(user.userId);
        });
    });
}

export default AppSocket;
