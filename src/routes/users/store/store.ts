import express from "express";
import Auth from "@middleware/Auth";
import CartController from "@controllers/CartController";
import StoreController from "@controllers/StoreController";
const store = express.Router();

store.get("/products", StoreController.GetProducts);
store.get("/product/:product_id", StoreController.GetSingleProduct);

// Cart and checkout routes
store.post("/checkout", Auth, CartController.Checkout);
store.get("/verify-payment/:reference", Auth, CartController.VerifyPayment);
store.get("/orders", Auth, CartController.GetUserOrders);
store.patch("/orders/:order_id/status", Auth, CartController.UpdateOrderStatus);

// Public webhook endpoint (no auth required)
store.post("/webhook/paystack", CartController.PaystackWebhook);

// Admin/maintenance routes
store.post(
  "/cleanup-expired-checkouts",
  Auth,
  CartController.CleanupExpiredCheckouts,
);

export default store;
