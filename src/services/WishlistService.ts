import { Wishlist } from "../utils/mongoSchema";
import type { Request } from "express";

export interface WishlistItem {
  userId: number;
  productId: string;
  product: any;
  dateAdded?: Date;
}

export interface WishlistResponse {
  error: boolean;
  message: string;
  data?: any;
}

export default class WishlistService {
  static async addToWishlist(
    userId: number,
    productId: string,
    product: any
  ): Promise<WishlistResponse> {
    try {
      // Check if item already exists in wishlist
      const existingItem = await Wishlist.findOne({ userId, productId });

      if (existingItem) {
        return {
          error: true,
          message: "Product already in wishlist"
        };
      }

      // Add new item to wishlist
      const wishlistItem = new Wishlist({
        userId,
        productId,
        product,
        dateAdded: new Date()
      });

      await wishlistItem.save();

      return {
        error: false,
        message: "Product added to wishlist successfully",
        data: wishlistItem
      };
    } catch (error: any) {
      console.error("Error adding to wishlist:", error);
      return {
        error: true,
        message: "Failed to add product to wishlist"
      };
    }
  }

  static async removeFromWishlist(
    userId: number,
    productId: string
  ): Promise<WishlistResponse> {
    try {
      const result = await Wishlist.findOneAndDelete({ userId, productId });

      if (!result) {
        return {
          error: true,
          message: "Product not found in wishlist"
        };
      }

      return {
        error: false,
        message: "Product removed from wishlist successfully"
      };
    } catch (error: any) {
      console.error("Error removing from wishlist:", error);
      return {
        error: true,
        message: "Failed to remove product from wishlist"
      };
    }
  }

  static async getUserWishlist(userId: number): Promise<WishlistResponse> {
    try {
      const wishlistItems = await Wishlist.find({ userId }).sort({ dateAdded: -1 });

      return {
        error: false,
        message: "Wishlist retrieved successfully",
        data: wishlistItems
      };
    } catch (error: any) {
      console.error("Error fetching wishlist:", error);
      return {
        error: true,
        message: "Failed to fetch wishlist"
      };
    }
  }

  static async checkIfInWishlist(
    userId: number,
    productId: string
  ): Promise<WishlistResponse> {
    try {
      const item = await Wishlist.findOne({ userId, productId });

      return {
        error: false,
        message: "Check completed",
        data: { inWishlist: !!item }
      };
    } catch (error: any) {
      console.error("Error checking wishlist:", error);
      return {
        error: true,
        message: "Failed to check wishlist status"
      };
    }
  }

  static async getWishlistCount(userId: number): Promise<WishlistResponse> {
    try {
      const count = await Wishlist.countDocuments({ userId });

      return {
        error: false,
        message: "Wishlist count retrieved successfully",
        data: { count }
      };
    } catch (error: any) {
      console.error("Error getting wishlist count:", error);
      return {
        error: true,
        message: "Failed to get wishlist count"
      };
    }
  }

  static async clearWishlist(userId: number): Promise<WishlistResponse> {
    try {
      await Wishlist.deleteMany({ userId });

      return {
        error: false,
        message: "Wishlist cleared successfully"
      };
    } catch (error: any) {
      console.error("Error clearing wishlist:", error);
      return {
        error: true,
        message: "Failed to clear wishlist"
      };
    }
  }
}
