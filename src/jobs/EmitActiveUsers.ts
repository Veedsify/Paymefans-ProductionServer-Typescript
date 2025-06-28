import { redis } from "@libs/RedisStore";

export default async function EmitActiveUsers(io: any) {
  const activeUsers = await redis.hgetall("activeUsers");
  const usersList = Object.values(activeUsers).map((value) =>
    JSON.parse(value),
  );

  io.emit("active_users", usersList);
}

// Cron Jobs
