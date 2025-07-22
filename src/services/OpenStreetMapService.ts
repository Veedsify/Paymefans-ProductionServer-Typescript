import { redis } from "@libs/RedisStore";

class OpenStreetMapService {
  static async GetLocation({
    longitude,
    latitude,
    username,
  }: {
    longitude: number;
    latitude: number;
    username?: string;
  }) {
    try {
      const getLocation = await redis.get(`location:${username}:data`);

      if (getLocation) {
        return JSON.parse(getLocation);
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      );

      if (!response.ok) {
        return null;
      }
      const location = await response.json();

      redis.set(
        `location:${username}:data`,
        JSON.stringify(location),
        "EX",
        3600,
      );

      return location;
    } catch (error) {
      throw new Error("Failed to fetch location");
    }
  }
}

export default OpenStreetMapService;
