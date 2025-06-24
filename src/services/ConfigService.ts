import query from "@utils/prisma";
import { redis } from "@libs/RedisStore";
import { Configurations } from "@prisma/client";

export default class ConfigService {
    static async Config(): Promise<{
        error: boolean;
        message: string;
        data: Configurations | null;
    }> {
        try {
            const cacheKey = "configs";
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData)
            }
            const config = await query.configurations.findFirst({
                where: { id: 1 },
            })
            if (!config) {
                return {
                    error: true,
                    message: "Config not found",
                    data: null,
                }
            }
            const response = {
                error: false,
                message: "Config fetched successfully",
                data: config,
            }
            // Cache the config data for 1 hour
            await redis.set(cacheKey, JSON.stringify(response), "EX", 10); // Set to 10 seconds for testing, change to 3600 for production
            return response
        } catch (error: any) {
            throw new Error(error.message)
        }
    }
}