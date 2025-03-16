"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = require("ioredis");
const redis = new ioredis_1.Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: 50, // Example value, adjust as needed
    retryStrategy(times) {
        // Implement your retry strategy logic here
        return Math.min(times * 50, 2000);
    }
});
exports.default = redis;
