import { redisSub } from "@libs/RedisStore";
import express, { Request, Response } from "express";
const events = express.Router();

events.get("/ping", (req: Request, res: Response) => {
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
    res.write(`event: ping\n\ndata: Connected to SSE for userId=${userId}\n\n`);

    await redisSub.subscribe(`media:processed:${userId}`, (message) => {
      res.write(
        `event: ping\ndata: ${JSON.stringify({
          mediaId: message,
          userid: userId,
        })}\n\n`,
      );
    });

    // Optional: Timeout protection
    const timeout = setTimeout(
      () => {
        console.log("SSE connection timed out for userId:", userId);
        res.end();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    req.on("close", () => clearTimeout(timeout));
    res.on("error", () => clearTimeout(timeout));
  },
);

// await redisSub.subscribe(`media:processed:${userId}`, (message) => {
//   res.write(
//     `event: ping\ndata: ${JSON.stringify({
//       mediaId: message,
//       userid: userId,
//     })}\n\n`,
//   );
// });

export default events;
