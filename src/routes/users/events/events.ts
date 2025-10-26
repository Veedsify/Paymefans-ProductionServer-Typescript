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

    // Initial connection message
    res.write(
      `event: ping\ndata: Connected to story media SSE for userId=${userId}\n\n`
    );

    const channelName = `media:processed:${userId}`;
    let writeCount = 0;
    const maxWrites = 5;
    let interval: NodeJS.Timeout | null = null;
    let lastData: string | null = null; // cache the most recent payload

    // Redis message listener
    const messageHandler = async (channel: string, mediaId: string) => {
      if (channel !== channelName) return;

      const data = JSON.stringify({ mediaId, userId });
      lastData = data; // store the latest data

      // Start sending only when we get first data
      if (!interval) {
        res.write(`event: story-processing-complete\ndata: ${data}\n\n`);
        writeCount++;

        interval = setInterval(async () => {
          if (writeCount >= maxWrites) {
            clearInterval(interval!);
            await cleanup();
            res.end();
            console.log(
              `Finished sending ${maxWrites} updates for user ${userId}`
            );
            return;
          }

          if (lastData) {
            res.write(
              `event: story-processing-complete\ndata: ${lastData}\n\n`
            );
            writeCount++;
            console.log(`Sent update #${writeCount} for user ${userId}`);
          }
        }, 10_000); // 10 seconds apart
      }
    };

    await redisSub.subscribe(channelName);
    redisSub.on("message", messageHandler);

    const cleanup = async () => {
      redisSub.off("message", messageHandler);
      await redisSub.unsubscribe(channelName);
      if (interval) clearInterval(interval);
      console.log(`Cleaned up SSE for user ${userId}`);
    };

    // Timeout safety (optional)
    const timeout = setTimeout(async () => {
      console.log(`SSE connection timed out for userId: ${userId}`);
      await cleanup();
      res.end();
    }, 5 * 60 * 1000);

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
    let writeCount = 0;
    const maxWrites = 5;
    let interval: NodeJS.Timeout | null = null;
    let lastData: string | null = null;

    // Redis message listener
    const messageHandler = async (channel: string, mediaId: string) => {
      if (channel !== channelName) return;

      const data = JSON.stringify({ mediaId, userId });
      lastData = data; // store latest data

      // Start sending only on first data
      if (!interval) {
        res.write(`event: message-processing-complete\ndata: ${data}\n\n`);
        writeCount++;

        interval = setInterval(async () => {
          if (writeCount >= maxWrites) {
            clearInterval(interval!);
            await cleanup();
            res.end();
            console.log(
              `Finished sending ${maxWrites} updates for user ${userId}`
            );
            return;
          }

          if (lastData) {
            res.write(
              `event: message-processing-complete\ndata: ${lastData}\n\n`
            );
            writeCount++;
            console.log(`Sent update #${writeCount} for user ${userId}`);
          }
        }, 10_000); // every 10 seconds
      }
    };

    await redisSub.subscribe(channelName);
    redisSub.on("message", messageHandler);

    // Cleanup function
    const cleanup = async () => {
      redisSub.off("message", messageHandler);
      await redisSub.unsubscribe(channelName);
      if (interval) clearInterval(interval);
      console.log(`Cleaned up SSE for user ${userId}`);
    };

    // Optional timeout protection
    const timeout = setTimeout(async () => {
      console.log(`SSE connection timed out for userId: ${userId}`);
      await cleanup();
      res.end();
    }, 5 * 60 * 1000);

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
