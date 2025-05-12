import query from "@utils/prisma";
import { redis } from "@libs/RedisStore";

export default class ConfigService {
    static async Config(): Promise<any> {
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
            await redis.set(cacheKey, JSON.stringify(response), "EX", 3600);
            return response
        } catch (error: any) {
            throw new Error(error.message)
        }
    }
}