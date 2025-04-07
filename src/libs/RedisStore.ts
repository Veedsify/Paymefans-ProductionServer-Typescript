// In RedisStore.ts - Make sure your exports look like this
import { Redis } from "ioredis";

// Main client for all regular operations and publishing
const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null
});

// Dedicated client ONLY for subscribing
const redisSub = new Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null
});

export { redis, redisSub };
