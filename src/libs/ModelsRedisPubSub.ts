import { redisSub } from "./RedisStore";

export default function ModelsRedisPubSub(io: any) {
  // Subscribe to a Redis channel
  redisSub.subscribe("models");
  // Event listener for Redis messages
  redisSub.on("message", (channel, PlatformModels) => {
    if (channel === "models") {
      console.log("Received message from Redis:", PlatformModels);
      // Emit the message to all connected Socket.IO clients
      io.emit("models-update", JSON.parse(PlatformModels)); // 'data-update' event can be received by the React client
    }
  });
}
