import { SocketUser } from "types/socket";
import IoInstance from "./io";
import redis from "./RedisStore";
import SocketService from "@services/SocketService";

let appSocket: any;
async function AppSocket(server: any) {
    const io = await IoInstance.init(server);
    io.on("connection", (socket: any) => {
        appSocket = socket;
        console.log("Socket Connected", appSocket.id);
        let userRoom = "";

        let user: SocketUser = {
            userId: "",
            username: "",
        };

        const emitActiveUsers = async () => {
            const activeUsers = await redis.hgetall("activeUsers");
            io.emit(
                "active_users",
                Object.values(activeUsers).map((value) => JSON.parse(value))
            );
        };
        emitActiveUsers();

        const interval = setInterval(() => {
            if (!user.userId) return;
            emitActiveUsers();
        }, 500);

        const AddtoUserRoom = (data: any) => {
            userRoom = data
        }

        // Socket Actions
        socket.on("user_active", (username: string) => SocketService.HandleUserActive(username, socket));
        socket.on("join", (data: string) => SocketService.HandleJoinRoom(AddtoUserRoom, socket, data));
        socket.on("message-seen", (data: any) => SocketService.HandleMessageSeen(data, socket, userRoom));
        socket.on("typing", (data: any) => SocketService.HandleTyping(data, socket, userRoom));
        socket.on("checkUserIsFollowing", (data: any) => SocketService.HandleCheckUserIsFollowing(data, socket));
        socket.on("followUser", (data: any) => SocketService.HandleFollowUser(data, socket));
        socket.on("join-upload-room", (data: any) => SocketService.JoinUploadRoom(socket, data));
        socket.on("post-viewed", (data: any) => SocketService.HandlePostViewed(data));
        // socket.on("new-message", handleMessage);
        socket.on("disconnect", async () => {
            clearInterval(interval);
            // invalidate conversations cache
            await redis.del(`conversations:${user.userId}`);
            await SocketService.HandleUserInactive(user.userId);
        });
    });
    return io;
}

export default AppSocket;
