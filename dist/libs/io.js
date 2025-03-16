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
Object.defineProperty(exports, "__esModule", { value: true });
let io;
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
const { ADMIN_PANEL_URL, VERIFICATION_URL, APP_URL, LIVESTREAM_PORT } = process.env;
const pubClient = (0, redis_1.createClient)({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();
const socket_io_1 = require("socket.io");
const socketOptions = {
    cors: {
        origin: [VERIFICATION_URL, ADMIN_PANEL_URL, LIVESTREAM_PORT, APP_URL],
        methods: ["GET", "POST"],
    },
    adapter: (0, redis_adapter_1.createAdapter)(pubClient, subClient),
};
exports.default = {
    init: (server) => __awaiter(void 0, void 0, void 0, function* () {
        // Connect to Redis before initializing Socket.IO with the adapter
        yield pubClient.connect();
        yield subClient.connect();
        io = new socket_io_1.Server(server, socketOptions);
        // Optional: Handle Redis connection errors
        pubClient.on('error', (err) => console.error('Redis Pub Error:', err));
        subClient.on('error', (err) => console.error('Redis Sub Error:', err));
        return io;
    }),
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
