import WishlistService from "@services/WishlistService";
import type { Request, Response } from "express";

export default class WishlistController {
  static async addToWishlist(req: Request, res: Response): Promise<any> {
    try {
      const { productId, product } = req.body;
      const user = req.user;

      if (!productId || !product) {
        return res.status(400).json({
          error: true,
          message: "Product ID and product data are required",
        });
      }

      const result = await WishlistService.addToWishlist(
        user.id,
        productId,
        product
      );

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in addToWishlist:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async removeFromWishlist(req: Request, res: Response): Promise<any> {
    try {
      const { productId } = req.params;
      const user = req.user;

      if (!productId) {
        return res.status(400).json({
          error: true,
          message: "Product ID is required",
        });
      }

      const result = await WishlistService.removeFromWishlist(
        user.id,
        productId
      );

      if (result.error) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in removeFromWishlist:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async getUserWishlist(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;

      const result = await WishlistService.getUserWishlist(user.id);

      if (result.error) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in getUserWishlist:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async checkIfInWishlist(req: Request, res: Response): Promise<any> {
    try {
      const { productId } = req.params;
      const user = req.user;

      if (!productId) {
        return res.status(400).json({
          error: true,
          message: "Product ID is required",
        });
      }

      const result = await WishlistService.checkIfInWishlist(
        user.id,
        productId
      );

      if (result.error) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in checkIfInWishlist:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async getWishlistCount(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;

      const result = await WishlistService.getWishlistCount(user.id);

      if (result.error) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in getWishlistCount:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async clearWishlist(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;

      const result = await WishlistService.clearWishlist(user.id);

      if (result.error) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in clearWishlist:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }
}
