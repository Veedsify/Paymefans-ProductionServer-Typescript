import query from "@utils/prisma";
import { redis } from "@libs/RedisStore";
import _ from "lodash";
import { Prisma } from "@prisma/client";
import OpenStreetMapService from "./OpenStreetMapService";
import { Permissions, RBAC } from "@utils/FlagsConfig";

export default class HookupService {
  // Get HookUp Models based on location
  static async GetNearbyHookups(
    user: { id: number },
    userLocation?: { latitude: number; longitude: number },
    limit: number = 6,
  ) {
    try {
      // If we have user location data, use it for proximity-based search
      if (userLocation) {
        // Try to get cached models
        const modelsCached = await redis.get("cached-hookup-accounts");
        let models: any[] = modelsCached ? JSON.parse(modelsCached) : null;
        if (!models) {
          // Only fetch models with location data and required flags
          models = await query.user.findMany({
            where: {
              is_model: true,
              Model: {
                hookup: true,
                verification_status: true,
              },
              NOT: {
                id: user.id,
                active_status: false,
                flags: {
                  array_contains: Permissions.PROFILE_HIDDEN,
                },
              },
            },
            select: {
              id: true,
              username: true,
              fullname: true,
              profile_image: true,
              profile_banner: true,
              is_model: true,
              location: true,
              state: true,
              Settings: {
                select: {
                  price_per_message: true,
                  subscription_price: true,
                },
              },
              UserLocation: {
                select: {
                  latitude: true,
                  longitude: true,
                  city: true,
                  state: true,
                  updated_at: true,
                },
              },
              Model: {
                select: {
                  hookup: true,
                  verification_status: true,
                  gender: true,
                },
              },
            },
            take: limit * 2, // Get more than needed to filter by distance
          });

          // Cache for 1 minute (60 seconds)
          await redis.set(
            "cached-hookup-accounts",
            JSON.stringify(models),
            "EX",
            60,
          );
        }

        // Calculate distance and sort by proximity
        const modelsWithDistance = models
          .reduce((acc: any[], model: any) => {
            const loc = model.UserLocation;
            const { Model, Settings, ...rest } = model;
            // Calculate distance using Haversine formula
            if (loc) {
              const distance = this.calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                loc.latitude,
                loc.longitude,
              );
              acc.push({
                ...rest,
                ...Model,
                ...Settings,
                distance,
                UserLocation: undefined, // Remove sensitive location data
              });
            }

            acc.push({
              ...rest,
              ...Model,
              ...Settings,
              UserLocation: undefined, // Remove sensitive location data
            });
            return acc;
          }, [])
          .sort((a, b) => a.distance - b.distance)
          .slice(0, limit);

        return {
          error: false,
          message: "Successfully fetched nearby hookups",
          hookups: modelsWithDistance,
        };
      } else {
        console.log("Here");
        // Fallback to IP-based or random selection if no precise location
        return await this.GetRandomHookups(user, limit);
      }
    } catch (error) {
      console.error("Error fetching nearby hookups:", error);
      return {
        error: true,
        message: "Error fetching hookups",
        hookups: [],
      };
    }
  }

  // Fallback method to get random hookups when location data isn't available
  static async GetRandomHookups(user: { id: number }, limit: number = 6) {
    try {
      const hookups = await redis.get(`hookups`);
      if (!hookups) {
        if (!user.id || typeof user.id !== "number") {
          throw new Error("Invalid user ID");
        }
        if (!limit || typeof limit !== "number" || limit <= 0) {
          throw new Error("Invalid limit value");
        }

        const models = await query.$queryRaw(Prisma.sql`
                                          SELECT "User".id,
                                                "User".username,
                                                "User".fullname,
                                                "User".profile_image,
                                                "User".profile_banner,
                                                "User".state,
                                                "User".location,
                                                "User".is_model,
                                                "Settings".price_per_message,
                                                "Settings".subscription_price,
                                                "Model".hookup,
                                                "Model".gender,
                                                "UserLocation".state as user_state,
                                                "UserLocation".city as user_city
                                          FROM "User"
                                                INNER JOIN "Model" ON "User".id = "Model".user_id
                                                LEFT JOIN "Settings" ON "User".id = "Settings".user_id
                                                LEFT JOIN "UserLocation" ON "User".id = "UserLocation".user_id
                                          WHERE "Model".verification_status = true
                                                AND "Model".hookup = true
                                                AND "User".id != ${user.id}
                                          ORDER BY RANDOM()
                                          LIMIT ${limit};
                                  `);

        const options = {
          error: false,
          message: "Successfully fetched hookups",
          hookups: models,
        };

        // Save to redis with shorter expiration for location-based data
        await redis.set(`hookups`, JSON.stringify(options), "EX", 60); // 1 minute
        return options;
      }

      return JSON.parse(hookups);
    } catch (error) {
      console.error("Error fetching random hookups:", error);
      return {
        error: true,
        message: "Error fetching hookups",
        hookups: [],
      };
    }
  }

  // Store user location data
  static async UpdateUserLocation(
    username: string,
    latitude: number,
    longitude: number,
  ) {
    try {
      const userExists = await query.user.findFirst({ where: { username } });
      if (!userExists) {
        return {
          error: false,
          message: "Invalid User Id",
        };
      }

      // Fetch OpenSteets Map Locations
      const location = await OpenStreetMapService.GetLocation({
        latitude,
        longitude,
        username,
      });

      // Update or create location record
      await query.userLocation.upsert({
        where: {
          user_id: userExists.id,
        },
        update: {
          latitude,
          longitude,
          state: location?.address?.state,
          city: location?.address?.county,
          updated_at: new Date(),
        },
        create: {
          user_id: userExists.id,
          latitude,
          longitude,
        },
      });

      return {
        error: false,
        message: "Location updated successfully",
      };
    } catch (error) {
      console.error("Error updating user location:", error);
      return {
        error: true,
        message: "Failed to update location",
      };
    }
  }

  // Calculate distance between two points using Haversine formula
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
