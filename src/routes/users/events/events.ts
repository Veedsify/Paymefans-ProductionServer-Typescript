import { redisSub } from "@libs/RedisStore";
import express, { Request, Response } from "express";
const events = express.Router();

events.get("/ping", (_: Request, res: Response) => {
  res.status(200).json({ message: "pong" });
});

events.get(
  "/story-media-state",
  async (req: Request, res: Response): Promise<any> => {
    const userId = req.query.userId as string;

    if (!userId || userId.trim() === "") {
      return res.status(400).json({
        error: "userId query parameter is required and cannot be empty",
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send welcome event
    res.write(`event: ping\ndata: Connected to SSE for userId=${userId}\n\n`);

    const channelName = `media:processed:${userId}`;

    // Set up the message listener for this specific channel
    const messageHandler = (channel: string, mediaId: string) => {
      if (channel === channelName) {
        res.write(
          `event: story-processing-complete\ndata: ${JSON.stringify({
            mediaId: mediaId,
            userid: userId,
          })}\n\n`,
        );
      }
    };

    // Subscribe to the channel
    await redisSub.subscribe(channelName);
    redisSub.on("message", messageHandler);

    // Cleanup function
    const cleanup = async () => {
      redisSub.off("message", messageHandler);
      await redisSub.unsubscribe(channelName);
      console.log(`Unsubscribed from ${channelName} for userId:`, userId);
    };

    // Optional: Timeout protection
    const timeout = setTimeout(
      async () => {
        console.log("SSE connection timed out for userId:", userId);
        await cleanup();
        res.end();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    req.on("close", async () => {
      clearTimeout(timeout);
      await cleanup();
    });

    res.on("error", async () => {
      clearTimeout(timeout);
      await cleanup();
    });
  },
);

events.get(
  "/message-media-state",
  async (req: Request, res: Response): Promise<any> => {
    const userId = req.query.userId as string;

    if (!userId || userId.trim() === "") {
      return res.status(400).json({
        error: "userId query parameter is required and cannot be empty",
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send welcome event
    res.write(
      `event: ping\ndata: Connected to message media SSE for userId=${userId}\n\n`
    );

    const channelName = `media:processed:${userId}`;

    // Set up the message listener for this specific channel
    const messageHandler = (channel: string, mediaId: string) => {
      if (channel === channelName) {
        res.write(
          `event: message-processing-complete\ndata: ${JSON.stringify({
            mediaId: mediaId,
            userid: userId,
          })}\n\n`
        );
      }
    };

    // Subscribe to the channel
    await redisSub.subscribe(channelName);
    redisSub.on("message", messageHandler);

    // Cleanup function
    const cleanup = async () => {
      redisSub.off("message", messageHandler);
      await redisSub.unsubscribe(channelName);
      console.log(`Unsubscribed from ${channelName} for userId:`, userId);
    };

    // Optional: Timeout protection
    const timeout = setTimeout(async () => {
      console.log("SSE connection timed out for userId:", userId);
      await cleanup();
      res.end();
    }, 5 * 60 * 1000); // 5 minutes

    req.on("close", async () => {
      clearTimeout(timeout);
      await cleanup();
    });

    res.on("error", async () => {
      clearTimeout(timeout);
      await cleanup();
    });
  }
);

export default events;
