import {redis} from "@libs/RedisStore";

export default async function EmitActiveUsers(io: any) {
    const activeUsers = await redis.hgetall("activeUsers");
    if (!activeUsers) {
        io.emit("activeUsers", {});
    }
    io.emit(
        "active_users",
        Object.values(activeUsers).map((value) => JSON.parse(value))
    );
}

// Cron Jobs

