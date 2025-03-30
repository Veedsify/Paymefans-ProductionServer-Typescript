// socketManager.js
import http from "http";

let io: any;
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "./RedisStore";

const pubClient = redis;
const subClient = redis.duplicate();
import { Server } from "socket.io";
const { ADMIN_PANEL_URL, VERIFICATION_URL, APP_URL, LIVESTREAM_PORT } =
  process.env;

const socketOptions = {
  cors: {
    origin: [
      VERIFICATION_URL as string,
      ADMIN_PANEL_URL as string,
      LIVESTREAM_PORT as string,
      APP_URL as string,
    ],
    methods: ["GET", "POST"],
  },
  adapter: createAdapter(pubClient, subClient),
};

export default {
  init: async (server: http.Server) => {
   
    io = new Server(server, socketOptions);

    // Optional: Handle Redis connection errors
    pubClient.on("error", (err) => console.error("Redis Pub Error:", err));
    subClient.on("error", (err) => console.error("Redis Sub Error:", err));

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};
