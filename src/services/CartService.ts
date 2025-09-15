import query from "@utils/prisma";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import type {
  CheckoutProps,
  CheckoutResponse,
  CartResponse,
  OrderStatus,
} from "../types/cart.d";
import type { AuthUser } from "../types/user.d";
import { PaystackService } from "./PaystackService";

export default class CartService {
  static async CreateOrder({
    user,
    items,
    shipping_address,
    payment_method,
  }: CheckoutProps & { user: AuthUser }): Promise<CheckoutResponse> {
    try {
      // Validate products and calculate total
      let totalAmount = 0;
      const orderItems = [];
      for (const item of items) {
        const product = await query.product.findUnique({
          where: { product_id: item.product_id },
          include: {
            images: true,
            sizes: {
              include: {
                size: true,
              },
            },
          },
        });

        if (!product) {
          return {
            error: true,
            message: `Product with ID ${item.product_id} not found`,
          };
        }

        if (product.instock < item.quantity) {
          return {
            error: true,
            message: `Insufficient stock for ${product.name}. Available: ${product.instock}`,
          };
        }

        // Validate size if provided
        if (item.size_id) {
          const hasSize = product.sizes.some((s) => s.size_id === item.size_id);
          if (!hasSize) {
            return {
              error: true,
              message: `Invalid size for ${product.name}`,
            };
          }
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: product.price,
          size_id: item.size_id || null,
        });
      }

      const orderId = GenerateUniqueId();
      const paymentReference = `order_${orderId}_${Date.now()}`;

      // Initialize payment with Paystack FIRST, before creating order
      if (payment_method === "paystack") {
        const paymentData = await PaystackService.InitializePayment({
          email: user.email,
          amount: totalAmount * 100, // Convert to kobo
          currency: "NGN",
          reference: paymentReference,
          callback_url: `${process.env.APP_URL}/store/payment/callback?reference=${paymentReference}`,
          metadata: {
            order_id: orderId,
            user_id: user.id,
            total_amount: totalAmount,
          },
        });

        if (paymentData.status) {
          // Store checkout data temporarily until payment is verified
          const checkoutData = {
            order_id: orderId,
            items: orderItems,
            shipping_address,
            total_amount: totalAmount,
          };

          // Store in pending checkout table with expiration
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 1); // Expire in 1 hour

          await query.pendingCheckout.create({
            data: {
              reference: paymentReference,
              user_id: user.id,
              order_data: checkoutData,
              expires_at: expiresAt,
            },
          });

          return {
            error: false,
            message: "Payment initialized successfully",
            data: {
              order_id: orderId,
              payment_url: paymentData.data.authorization_url,
              reference: paymentReference,
              total_amount: totalAmount,
            },
          };
        } else {
          return {
            error: true,
            message: "Failed to initialize payment",
          };
        }
      }

      return {
        error: true,
        message: "Invalid payment method",
      };
    } catch (error: any) {
      console.error("Error creating order:", error);
      return {
        error: true,
        message: "Failed to create order",
      };
    }
  }

  static async VerifyPayment(reference: string): Promise<CartResponse> {
    try {
      // Check if order already exists (prevent double processing)
      const existingOrder = await query.order.findFirst({
        where: { payment_reference: reference },
      });

      if (existingOrder) {
        return {
          error: false,
          message: "Order already processed",
          data: { order_id: existingOrder.order_id },
        };
      }

      // First, get the pending checkout data
      const pendingCheckout = await query.pendingCheckout.findUnique({
        where: { reference },
        include: { user: true },
      });

      if (!pendingCheckout) {
        return {
          error: true,
          message: "Checkout session not found or expired",
        };
      }

      // Check if checkout has expired
      if (new Date() > pendingCheckout.expires_at) {
        // Clean up expired checkout
        await query.pendingCheckout.delete({
          where: { reference },
        });
        return {
          error: true,
          message: "Checkout session has expired",
        };
      }

      const paymentValidation =
        await PaystackService.ValidatePayment(reference);

      if (paymentValidation.error) {
        return {
          error: true,
          message: paymentValidation.message || "Payment verification failed",
        };
      }

      // Payment is successful, now create the actual order
      const orderData = pendingCheckout.order_data as any;

      // Validate products and stock again (in case stock changed during payment)
      for (const item of orderData.items) {
        const product = await query.product.findUnique({
          where: { product_id: item.product_id },
        });

        if (!product) {
          return {
            error: true,
            message: `Product ${item.product_id} no longer available`,
          };
        }

        if (product.instock < item.quantity) {
          return {
            error: true,
            message: `Insufficient stock for ${product.name}. Available: ${product.instock}`,
          };
        }
      }

      // Create order and update stock in a transaction
      const order = await query.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            order_id: orderData.order_id,
            user_id: pendingCheckout.user_id,
            total_amount: orderData.total_amount,
            status: "processing",
            payment_status: "paid",
            payment_reference: reference,
            shipping_address: JSON.stringify(orderData.shipping_address),
            items: {
              create: orderData.items,
            },
          },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: true,
                  },
                },
                size: true,
              },
            },
          },
        });

        // Reduce product stock
        for (const item of orderData.items) {
          await tx.product.update({
            where: { product_id: item.product_id },
            data: {
              instock: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Clean up the pending checkout
        await tx.pendingCheckout.delete({
          where: { reference },
        });

        return newOrder;
      });

      return {
        error: false,
        message: "Payment verified and order created successfully",
        data: {
          order_id: order.order_id,
          order: {
            ...order,
            shipping_address: JSON.parse(order.shipping_address as string),
          },
        },
      };
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      return {
        error: true,
        message: "Failed to verify payment",
      };
    }
  }

  static async GetUserOrders(userId: number): Promise<CartResponse> {
    try {
      const orders = await query.order.findMany({
        where: { user_id: userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
              size: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      });

      const formattedOrders = orders.map((order) => ({
        ...order,
        shipping_address: JSON.parse(order.shipping_address as string),
        items: order.items.map((item) => ({
          ...item,
          product: {
            ...item.product,
            images: item.product.images.map((img) => ({
              ...img,
              image_url: `${process.env.AWS_CLOUDFRONT_URL}/${img.image_url}`,
            })),
          },
        })),
      }));

      return {
        error: false,
        message: "Orders retrieved successfully",
        data: formattedOrders,
      };
    } catch (error: any) {
      console.error("Error getting user orders:", error);
      return {
        error: true,
        message: "Failed to retrieve orders",
      };
    }
  }

  static async UpdateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<CartResponse> {
    try {
      const order = await query.order.update({
        where: { order_id: orderId },
        data: { status },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
              size: true,
            },
          },
        },
      });

      return {
        error: false,
        message: "Order status updated successfully",
        data: order,
      };
    } catch (error: any) {
      console.error("Error updating order status:", error);
      return {
        error: true,
        message: "Failed to update order status",
      };
    }
  }

  // Cleanup expired pending checkouts
  static async CleanupExpiredCheckouts(): Promise<{ cleaned: number }> {
    try {
      const result = await query.pendingCheckout.deleteMany({
        where: {
          expires_at: {
            lt: new Date(),
          },
        },
      });

      console.log(`Cleaned up ${result.count} expired pending checkouts`);
      return { cleaned: result.count };
    } catch (error: any) {
      console.error("Error cleaning up expired checkouts:", error);
      return { cleaned: 0 };
    }
  }

  // Auto-cleanup function that should be called periodically
  static async AutoCleanupExpiredCheckouts(): Promise<void> {
    try {
      const result = await this.CleanupExpiredCheckouts();
      if (result.cleaned > 0) {
        console.log(
          `Auto-cleanup: Removed ${result.cleaned} expired pending checkouts`,
        );
      }
    } catch (error) {
      console.error("Error in auto-cleanup:", error);
    }
  }
}
