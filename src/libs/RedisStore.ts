// In RedisStore.ts - Make sure your exports look like this
import { Redis } from "ioredis";

const { REDIS_ADDR, REDIS_PORT, REDIS_PASSWORD } = process.env;

if (!REDIS_ADDR || !REDIS_PORT) {
  throw new Error("Missing Redis configuration in environment variables");
}

// Main client for all regular operations and publishing
const redis = new Redis({
  host: REDIS_ADDR,
  port: REDIS_PORT ? parseInt(REDIS_PORT, 10) : 6379,
  password: REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

// Dedicated client ONLY for subscribing
const redisSub = new Redis({
  host: REDIS_ADDR,
  port: REDIS_PORT ? parseInt(REDIS_PORT, 10) : 6379,
  password: REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

export { redis, redisSub };
