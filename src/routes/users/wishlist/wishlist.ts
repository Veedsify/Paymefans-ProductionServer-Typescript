import { Router } from "express";
import WishlistController from "@controllers/WishlistController";
import Auth from "@middleware/Auth";
const wishlist = Router();

// Add product to wishlist
wishlist.post("/add", Auth, WishlistController.addToWishlist);

// Remove product from wishlist
wishlist.delete(
  "/remove/:productId",
  Auth,
  WishlistController.removeFromWishlist,
);

// Get user's wishlist
wishlist.get("/", Auth, WishlistController.getUserWishlist);

// Check if product is in wishlist
wishlist.get("/check/:productId", Auth, WishlistController.checkIfInWishlist);

// Get wishlist count
wishlist.get("/count", Auth, WishlistController.getWishlistCount);

// Clear entire wishlist
wishlist.delete("/clear", Auth, WishlistController.clearWishlist);

export default wishlist;
