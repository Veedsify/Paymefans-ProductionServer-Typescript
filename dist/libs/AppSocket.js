"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const io_1 = __importDefault(require("./io"));
const RedisStore_1 = __importDefault(require("./RedisStore"));
const SocketService_1 = __importDefault(require("@services/SocketService"));
let appSocket;
function AppSocket(server) {
    return __awaiter(this, void 0, void 0, function* () {
        const io = yield io_1.default.init(server);
        io.on("connection", (socket) => {
            appSocket = socket;
            console.log("Socket Connected", appSocket.id);
            let userRoom = "";
            let user = {
                userId: "",
                username: "",
            };
            const emitActiveUsers = () => __awaiter(this, void 0, void 0, function* () {
                const activeUsers = yield RedisStore_1.default.hgetall("activeUsers");
                io.emit("active_users", Object.values(activeUsers).map((value) => JSON.parse(value)));
            });
            emitActiveUsers();
            const interval = setInterval(() => {
                if (!user.userId)
                    return;
                emitActiveUsers();
            }, 500);
            const AddtoUserRoom = (data) => {
                userRoom = data;
            };
            // Socket Actions
            socket.on("user_active", (username) => SocketService_1.default.HandleUserActive(username, socket));
            socket.on("join", (data) => SocketService_1.default.HandleJoinRoom(AddtoUserRoom, socket, data));
            socket.on("message-seen", (data) => SocketService_1.default.HandleMessageSeen(data, socket, userRoom));
            socket.on("typing", (data) => SocketService_1.default.HandleTyping(data, socket, userRoom));
            socket.on("checkUserIsFollowing", (data) => SocketService_1.default.HandleCheckUserIsFollowing(data, socket));
            socket.on("followUser", (data) => SocketService_1.default.HandleFollowUser(data, socket));
            socket.on("join-upload-room", (data) => SocketService_1.default.JoinUploadRoom(socket, data));
            socket.on("post-viewed", (data) => SocketService_1.default.HandlePostViewed(data));
            // socket.on("new-message", handleMessage);
            socket.on("disconnect", () => __awaiter(this, void 0, void 0, function* () {
                clearInterval(interval);
                // invalidate conversations cache
                yield RedisStore_1.default.del(`conversations:${user.userId}`);
                yield SocketService_1.default.HandleUserInactive(user.userId);
            }));
        });
        return io;
    });
}
exports.default = AppSocket;
