import CartService from "@services/CartService";
import type { Request, Response } from "express";
import type { CheckoutProps } from "../types/cart.d";

export default class CartController {
  static async Checkout(req: Request, res: Response): Promise<any> {
    try {
      const { items, shipping_address, payment_method }: CheckoutProps =
        req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: true,
          message: "Unauthorized",
        });
      }

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: true,
          message: "Cart items are required",
        });
      }

      if (
        !shipping_address ||
        !shipping_address.name ||
        !shipping_address.address
      ) {
        return res.status(400).json({
          error: true,
          message: "Shipping address is required",
        });
      }

      if (!payment_method || payment_method !== "paystack") {
        return res.status(400).json({
          error: true,
          message: "Valid payment method is required",
        });
      }

      const result = await CartService.CreateOrder({
        user,
        items,
        shipping_address,
        payment_method,
      });

      if (result.error) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in checkout:", error);
      res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async VerifyPayment(req: Request, res: Response): Promise<any> {
    try {
      const { reference } = req.params;

      if (!reference) {
        return res.status(400).json({
          error: true,
          message: "Payment reference is required",
        });
      }

      const result = await CartService.VerifyPayment(reference);

      if (result.error) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async GetUserOrders(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: true,
          message: "Unauthorized",
        });
      }

      const result = await CartService.GetUserOrders(user.id);

      if (result.error) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error getting user orders:", error);
      res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async UpdateOrderStatus(req: Request, res: Response): Promise<any> {
    try {
      const { order_id } = req.params;
      const { status } = req.body;

      if (!order_id || !status) {
        return res.status(400).json({
          error: true,
          message: "Order ID and status are required",
        });
      }

      const validStatuses = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: true,
          message: "Invalid order status",
        });
      }

      const result = await CartService.UpdateOrderStatus(order_id, status);

      if (result.error) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error updating order status:", error);
      res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async PaystackWebhook(req: Request, res: Response): Promise<any> {
    try {
      const event = req.body;
      const paystackSignature = req.headers["x-paystack-signature"];

      // Verify webhook signature
      const crypto = require("crypto");
      const hash = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(event))
        .digest("hex");

      if (hash !== paystackSignature) {
        return res.status(400).json({
          error: true,
          message: "Invalid signature",
        });
      }

      // Handle charge.success event
      if (event.event === "charge.success") {
        const reference = event.data.reference;

        // Process the payment verification
        const result = await CartService.VerifyPayment(reference);

        if (!result.error) {
          console.log(`Webhook: Payment verified for reference ${reference}`);
        } else {
          console.error(
            `Webhook: Payment verification failed for reference ${reference}`,
            result.message,
          );
        }
      }

      res.status(200).json({ message: "Webhook received" });
    } catch (error: any) {
      console.error("Error processing webhook:", error);
      res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }

  static async CleanupExpiredCheckouts(
    req: Request,
    res: Response,
  ): Promise<any> {
    try {
      const user = req.user;

      // Only allow admin users to trigger cleanup
      if (!user || !user.admin) {
        return res.status(403).json({
          error: true,
          message: "Unauthorized - Admin access required",
        });
      }

      const result = await CartService.CleanupExpiredCheckouts();

      res.status(200).json({
        error: false,
        message: `Cleanup completed. Removed ${result.cleaned} expired checkouts.`,
        data: result,
      });
    } catch (error: any) {
      console.error("Error cleaning up expired checkouts:", error);
      res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }
}
