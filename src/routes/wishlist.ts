import { Router } from "express";
import WishlistController from "@controllers/WishlistController";
import Auth from "@middleware/Auth";
const router = Router();

// Add product to wishlist
router.post("/add", Auth, WishlistController.addToWishlist);

// Remove product from wishlist
router.delete(
  "/remove/:productId",
  Auth,
  WishlistController.removeFromWishlist,
);

// Get user's wishlist
router.get("/", Auth, WishlistController.getUserWishlist);

// Check if product is in wishlist
router.get("/check/:productId", Auth, WishlistController.checkIfInWishlist);

// Get wishlist count
router.get("/count", Auth, WishlistController.getWishlistCount);

// Clear entire wishlist
router.delete("/clear", Auth, WishlistController.clearWishlist);

export default router;
