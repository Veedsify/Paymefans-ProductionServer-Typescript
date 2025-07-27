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
import ModelsRedisPubSub from "@libs/ModelsRedisPubSub";
import IoInstance from "@libs/io";
import HookupRedisPubSub from "@libs/HookupRedisPubSub";
import type { Request, Response } from "express";
import { connectDB } from "@utils/mongodb";
import cookieParser from "cookie-parser";
import InitializeQueueJobs from "@libs/InitializeQueueJobs";
import { CronJobService } from "@services/CronJobService";
const { ADMIN_PANEL_URL, VERIFICATION_URL, APP_URL } = process.env;

const app = express();
const server = http.createServer(app);
const port = 3009;

// HTTP request logging
app.use(logger("dev"));

// Cookie parser
app.use(cookieParser());

// Cors Origins
const origins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://192.168.18.126",
  "http://192.168.18.126:3009",
  "http://192.168.18.126:3000",
  "http://192.168.0.115:3000",
  "http://192.168.0.115:3009",
  "http://23.20.241.255:3000",
  VERIFICATION_URL!,
  ADMIN_PANEL_URL!,
  APP_URL!,
].filter(Boolean);

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
  // Redis Model PubSub
  await ModelsRedisPubSub(instance);
  // Hookup Redis PubSub
  await HookupRedisPubSub(instance);
  // Initialize Cron Jobs
  CronJobService.initialize();
});

// Connect to MongoDB
connectDB();

// Register Cloudflare Webhook
RegisterCloudflareStreamWebhook();

// Serve static files from the "public" directory
app.use(express.static(path.join("public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Basic route
app.use("/api", api);
app.use("/admin", admin);
//Bullmq For Emails,

// Custom error-handling middleware
app.use((err: any, _: Request, res: Response, next: NextFunction) => {
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
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.info(`Server started on port ${port}`);
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
