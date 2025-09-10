import "module-alias/register";
import express from "express";
import type { NextFunction } from "express";
import path from "path";
import http from "http";
import api from "@routes/api";
import admin from "@routes/admin";
import AppSocket from "@libs/AppSocket";
import { RegisterCloudflareStreamWebhook } from "@libs/RegisterCloudflareStreamWebhook";
import cors from "cors";
import logger from "morgan";
import IoInstance from "@libs/io";
import type { Request, Response } from "express";
import { connectDB } from "@utils/mongodb";
import cookieParser from "cookie-parser";
import InitializeQueueJobs from "@libs/InitializeQueueJobs";
import { CronJobService } from "@services/CronJobService";
import compression from "compression";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import helmet from "helmet";
import auth from "@routes/users/auth/auth";
import Paths from "@utils/paths";
import query from "@utils/prisma";
import { config } from "config/config";
const { ADMIN_PANEL_URL, VERIFICATION_URL, APP_URL } = process.env;

const app = express();
const server = http.createServer(app);

// Configure server timeouts and connection limits for DDoS protection
server.timeout = 30000; // 30 seconds timeout
server.keepAliveTimeout = 5000; // 5 seconds keep-alive timeout
server.headersTimeout = 6000; // 6 seconds headers timeout
server.maxConnections = 10000; // Maximum concurrent connections

/**
 * HTTP request logging
 * Use 'dev' format for non-production, 'combined' for production.
 */
if (process.env.NODE_ENV === "production") {
  app.use(logger("combined"));
} else {
  app.use(logger("dev"));
}

// Security headers middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for now, configure as needed
    crossOriginEmbedderPolicy: false, // Disable for Socket.IO compatibility
  }),
);

// Trust proxy if behind reverse proxy (Cloudflare, nginx, etc.)
app.set("trust proxy", 1);

// Prevent common attacks
app.use((req: Request, res: Response, next: NextFunction) => {
  // Prevent null byte attacks
  if (req.url.indexOf("\0") !== -1) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  // Prevent excessive header size
  const headerSize = JSON.stringify(req.headers).length;
  if (headerSize > 8192) {
    // 8KB limit
    res.status(413).json({ error: "Request headers too large" });
    return;
  }

  next();
});

// General rate limiting - applies to all requests
const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for certain routes if needed
    return req.ip === "127.0.0.1" || req.ip === "::1"; // Skip localhost in development
  },
});

// API-specific rate limiting - more restrictive for API routes
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 API requests per windowMs
  message: {
    error: "Too many API requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain routes if needed
    return req.ip === "127.0.0.1" || req.ip === "::1"; // Skip localhost in development
  },
});

// Auth route rate limiting - very restrictive for login/register routes
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 5 auth attempts per windowMs
  message: {
    error:
      "Too many authentication attempts from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain routes if needed
    return req.ip === "127.0.0.1" || req.ip === "::1"; // Skip localhost in development
  },
});

// Slow down middleware - progressively delays responses
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: (used, req) => {
    const delayAfter = (req as any).slowDown.delayAfter;
    return (used - delayAfter) * 100; // add 100ms of delay per request after delayAfter
  },
  legacyHeaders: false, // Disable the `X-SlowDown-*` headers
  skip: (req) => {
    // Skip speed limiting for certain routes if needed
    return req.ip === "127.0.0.1" || req.ip === "::1"; // Skip localhost in development
  },
  maxDelayMs: 2000, // maximum delay of 2 seconds
});

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Apply speed limiting to all requests
app.use(speedLimiter);

// ShrinkRay - Compression middleware
app.use(compression({ filter: shouldCompress }));

function shouldCompress(req: Request, res: Response) {
  if (req.headers["x-no-compression"]) {
    // don't compress responses with this request header
    return false;
  }

  // fallback to standard filter function
  return compression.filter(req, res);
}

// Cookie parser
app.use(cookieParser());

// Cors Origins
const origins = [VERIFICATION_URL!, ADMIN_PANEL_URL!, APP_URL!].filter(Boolean);

// Cors
app.use(
  cors({
    origin: origins,
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Instance of Socket.IO
IoInstance.init(server).then(async (instance) => {
  // Initialize Queue Jobs
  await InitializeQueueJobs();
  // Socket.IO instance
  await AppSocket(instance);
});

// Connect to MongoDB
connectDB();
query.$connect().then(() => console.log("DB ready"));

// Register Cloudflare Webhook
RegisterCloudflareStreamWebhook();

// Serve static files from the "public" directory
app.use(express.static(path.join("public")));
app.use(express.urlencoded({ extended: false, limit: "10mb" })); // Limit request size
app.use(express.json({ limit: "10mb" })); // Limit JSON payload size

// Basic route with specific rate limiting for auth routes
app.use(Paths.API.Base + Paths.API.Auth.Base, authLimiter, auth); // Apply strict auth limiting to auth routes
app.use(Paths.API.Base, apiLimiter, api);
app.use(Paths.ADMIN.Base, admin);
//Bullmq For Emails,

// 404 handler for undefined routes
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested route ${req.originalUrl} was not found on this server.`,
  });
});

// Custom error-handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction): any => {
  // Rate limit error handling
  if (err.status === 429) {
    console.warn(
      `Rate limit exceeded for IP: ${req.ip}, User-Agent: ${req.get("User-Agent")}`,
    );
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: err.retryAfter || "15 minutes",
    });
  }

  // Payload too large error handling
  if (err.type === "entity.too.large") {
    console.warn(
      `Large payload attempt from IP: ${req.ip}, Size: ${err.length}`,
    );
    return res.status(413).json({
      error: "Payload Too Large",
      message: "Request payload exceeds the maximum allowed size.",
    });
  }

  console.error(`Error occurred: ${err.message}`);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    },
  });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await CronJobService.destroy();
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

// Start the server
server.listen(config.defaultPort, () => {
  console.info(`Server started on port ${config.defaultPort}`);
});

// Handle uncaught exceptions and unhandled promise rejections
process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1); // Exit the process with a non-zero status code
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1); // Exit the process with a non-zero status code
});
