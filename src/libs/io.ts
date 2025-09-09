// socketManager.js
import http from "http";

let io: any;
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "./RedisStore";

const pubClient = redis;
const subClient = redis.duplicate();
import { Server, ServerOptions } from "socket.io";
const { ADMIN_PANEL_URL, VERIFICATION_URL, APP_URL, LIVESTREAM_PORT } =
  process.env;

// Helper to construct full URL if origin is a port number
const constructOrigin = (origin: string | undefined) => {
  if (!origin || typeof origin !== "string" || origin.trim() === "")
    return null;
  if (origin.startsWith("http")) return origin;
  // Assume it's a port number, construct localhost URL
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

// Try to create Redis adapter, fallback to in-memory if Redis is not available
let adapter;
try {
  if (pubClient.status === "ready" && subClient.status === "ready") {
    adapter = createAdapter(pubClient, subClient);
  }
} catch (error) {
  console.warn("Redis not available, using in-memory adapter:", error);
}

const socketOptions: Partial<ServerOptions> = {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  connectTimeout: 20000,
  ...(adapter && { adapter }),
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
  disconnect: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    io.close();
  },
};
