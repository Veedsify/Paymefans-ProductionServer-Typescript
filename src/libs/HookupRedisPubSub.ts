import { redisSub } from "./RedisStore";

export default function HookupRedisPubSub(io: any) {
  // Subscribe to a Redis channel
  redisSub.subscribe("hookups");
  // Event listener for Redis messages
  redisSub.on("message", (channel, PlatformHookups) => {
    if (channel === "hookups") {
      // Emit the message to all connected Socket.IO clients
      io.emit("hookup-update", JSON.parse(PlatformHookups)); // 'data-update' event can be received by the React client
    }
  });
}
