// socketManager.js
import http from "http";
import { Server, ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis, redisSub } from "./RedisStore";
import { Socket } from "socket.io";

let io: any;

const {
  ADMIN_PANEL_URL,
  VERIFICATION_URL,
  APP_URL,
  LIVESTREAM_PORT,
} = process.env;

// Helper to construct full URL if origin is a port number
const constructOrigin = (origin: string | undefined) => {
  if (!origin || typeof origin !== "string" || origin.trim() === "") return null;
  if (origin.startsWith("http")) return origin;
  const port = parseInt(origin);
  if (!isNaN(port)) return `http://localhost:${port}`;
  return null;
};

// Filter and construct valid origins
const allowedOrigins = [
  constructOrigin(VERIFICATION_URL),
  constructOrigin(ADMIN_PANEL_URL),
  constructOrigin(APP_URL),
  constructOrigin(LIVESTREAM_PORT),
].filter((origin) => origin !== null);

// In development, if no origins are set, allow localhost origins for common ports
if (allowedOrigins.length === 0 && process.env.NODE_ENV === "development") {
  allowedOrigins.push(
    "http://localhost:3000", // Client
    "http://localhost:3002", // Verification
    "http://localhost:8080", // Admin
    "http://localhost:3009", // Server (if needed)
  );
}

export default {
  init: async (server: http.Server) => {
    let adapter;

    try {
      // ✅ Wait for both Redis clients to be ready
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          if (redis.status === "ready") {
            resolve();
          } else {
            redis.once("ready", () => resolve());
            redis.once("error", reject);
          }
        }),
        new Promise<void>((resolve, reject) => {
          if (redisSub.status === "ready") {
            resolve();
          } else {
            redisSub.once("ready", () => resolve());
            redisSub.once("error", reject);
          }
        }),
      ]);

      // ✅ Now create adapter — clients are guaranteed ready
      adapter = createAdapter(redis, redisSub);
    } catch (error) {
      console.warn("⚠️ Redis adapter failed, falling back to in-memory:", error);
    }

    const socketOptions: Partial<ServerOptions> = {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,     // 60 seconds to respond to ping
      pingInterval: 25000,    // Send ping every 25s
      connectTimeout: 45000,  // Initial connection timeout
      ...(adapter && { adapter }),
    };

    io = new Server(server, socketOptions);

    // Log connections for debugging
    io.on("connection", (socket: Socket) => {
      socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    // Handle Redis errors
    redis.on("error", (err) => console.error("❌ Redis (pub) error:", err));
    redisSub.on("error", (err) => console.error("❌ Redis (sub) error:", err));

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error("Socket.IO not initialized!");
    }
    return io;
  },

  disconnect: () => {
    if (!io) {
      throw new Error("Socket.IO not initialized!");
    }
    io.close();
    redis.quit();
    redisSub.quit();
  },
};