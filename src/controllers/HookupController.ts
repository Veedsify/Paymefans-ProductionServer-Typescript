import { Request, Response } from "express";
import HookupService from "@services/HookupService";
import { AuthUser } from "types/user";

export default class HookupController {
  static async updateLocation(req: Request, res: Response): Promise<any> {
    try {
      const { latitude, longitude } = req.body;
      const username = req.user?.username;

      if (!username) {
        return res.status(401).json({
          error: true,
          message: "Unauthorized",
        });
      }

      if (!latitude || !longitude) {
        return res.status(400).json({
          error: true,
          message: "Latitude and longitude are required",
        });
      }

      // Update user location
      const result = await HookupService.UpdateUserLocation(
        username,
        latitude,
        longitude,
      );

      if (result.error) {
        return res.status(500).json(result);
      }

      // Location updated - hookups will be fetched via HTTP API when needed
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error updating location:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to update location",
      });
    }
  }

  static async getNearbyHookups(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { latitude, longitude } = req.query;

      if (!userId) {
        return res.status(401).json({
          error: true,
          message: "Unauthorized",
        });
      }

      let userLocation;
      if (latitude && longitude) {
        userLocation = {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        };
      }

      // Get nearby hookups
      const hookups = await HookupService.GetNearbyHookups(
        req.user as AuthUser,
        userLocation,
      );

      return res.status(200).json(hookups);
    } catch (error) {
      console.error("Error getting nearby hookups:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to get nearby hookups",
      });
    }
  }
}
