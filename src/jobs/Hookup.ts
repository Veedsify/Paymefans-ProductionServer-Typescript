import { redis } from "@libs/RedisStore";
import HookupService from "@services/HookupService";
import _ from "lodash";
import query from "@utils/prisma";

async function TriggerHookups(
  username: string,
  userLocation?: { latitude: number; longitude: number },
) {
  try {
    // Get user data
    const user = await query.user.findFirst({
      where: {
        username: username,
      },
      select: {
        id: true,
        UserLocation: true,
      },
    });

    if (!user) {
      return {
        error: true,
        message: "User not found",
        hookups: [],
      };
    }

    const longitude =
      user.UserLocation?.longitude ?? userLocation?.longitude ?? 0;
    const latitude = user.UserLocation?.latitude ?? userLocation?.latitude ?? 0;

    // Get hookups based on location if available, otherwise get random hookups
    const hookups = await HookupService.GetNearbyHookups(
      user,
      {
        latitude,
        longitude,
      },
      6,
    );

    // Publish to Redis for real-time updates
    redis.publish("hookups", JSON.stringify(hookups));

    return hookups;
  } catch (error) {
    console.error("Error triggering hookups:", error);
    return {
      error: true,
      message: "Error fetching hookups",
      hookups: [],
    };
  }
}

export default TriggerHookups;
