import query from "@utils/prisma";
import { BuyPointResponse, ConversionRateResponse, CreatePaystackPaymentProps, GetGlobalPointsResponse, PaystackPaymentCallbackResponse, PaystackPointBuyResponse, PointPurchaseResponse, PricePerMessageResponse, RetrievePointResponse } from "../types/points";
import { GlobalPointsBuy } from "@prisma/client";
import { AuthUser } from "types/user";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { redis } from "@libs/RedisStore";

export default class PointService {
      static async RetrievePoints(userid: number): Promise<RetrievePointResponse> {
            try {
                  const UserPoints = await query.userPoints.findFirst({
                        where: {
                              user_id: userid
                        },
                        select: {
                              points: true,
                        },
                  });
                  return { points: UserPoints?.points || 0, status: true }
            } catch (err: any) {
                  console.log(err.message)
                  throw new Error(err.message)
            }
      }
      // Buy points
      static async BuyPoints(user: AuthUser, points_buy_id: string): Promise<BuyPointResponse> {
            try {
                  const point = await query.globalPointsBuy.findFirst({
                        where: { points_buy_id },
                  });
                  query.$disconnect();

                  if (!point) {
                        return { message: "Sorry you cant buy this package", status: false };
                  }
                  const createNewPointsOrder = await this.PaystackPayment(point, user);
                  query.$disconnect();
                  return createNewPointsOrder;
            } catch (err: any) {
                  console.log(err.message)
                  throw new Error(err.message)
            }
      }

      // Paystack payment
      static async PaystackPayment(point: GlobalPointsBuy, user: AuthUser): Promise<PaystackPointBuyResponse> {
            try {
                  const referenceId = `PNT${GenerateUniqueId()}`
                  const priceOfPoints = point.amount * 1.02
                  await query.userPointsPurchase.create({
                        data: {
                              purchase_id: referenceId,
                              user_id: user.id,
                              points: point.points,
                              amount: priceOfPoints,
                              success: false,
                        },
                  });
                  query.$disconnect();

                  const CreateOrder = await fetch(
                        "https://api.paystack.co/transaction/initialize",
                        {
                              method: "POST",
                              headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                              },
                              body: JSON.stringify({
                                    amount: priceOfPoints * 100,
                                    email: user.email,
                                    reference: referenceId,
                                    callback_url: process.env.SERVER_ORIGINAL_URL + "/api/points/callback",
                              }),
                        }
                  );
                  const data = await CreateOrder.json();
                  return { ...data };
            } catch (error: any) {
                  throw new Error(error.message);
            }
      }
      // Conversion rate
      static async GetConversionRate(userId: number): Promise<ConversionRateResponse> {
            try {
                  // Find either user's conversion rate or global conversion rate, avoiding multiple queries
                  const conversionRate = await query.pointConversionRate.findFirst({
                        where: {
                              OR: [
                                    {
                                          pointConversionRateUsers: {
                                                some: {
                                                      user_id: userId
                                                }
                                          }
                                    },
                                    {
                                          pointConversionRateUsers: {
                                                none: {}
                                          }
                                    }
                              ]
                        }
                  });

                  // If a conversion rate is found, use it. If not, fall back to a default rate.
                  if (conversionRate) {
                        return {
                              error: false,
                              rate: conversionRate.points,
                              message: 'Rate Retrieved Successfully',
                        };
                  }

                  // If no conversion rate found, fall back to the default rate from the environment
                  const rate = Number(process.env.PRICE_PER_POINT);
                  return {
                        error: false,
                        rate: rate,
                        message: 'Rate Retrieved Successfully',
                  };
            } catch (err: any) {
                  console.log(err.message)
                  throw new Error(err.message)
            }
      }
      // Purchase points
      static async PurchasePoints(user: AuthUser, amount: string): Promise<PointPurchaseResponse> {
            try {

                  if (!user) {
                        return {
                              error: true,
                              status: false,
                              message: "User not found"
                        }
                  }

                  if (!amount) {
                        return {
                              error: true,
                              status: false,
                              message: "Amount is required"
                        }
                  }

                  const rate = await this.GetConversionRate(user.id)

                  if (rate.error == true) {
                        return {
                              status: false,
                              error: true,
                              message: rate.message
                        }
                  }

                  const platformFee = Number(process.env.PLATFORM_FEE) * Number(amount)
                  const points = ((Number(amount) - platformFee) / Number(rate?.rate))
                  const response = await this.CreatePaystackPayment({ amount: parseInt(amount), platformFee, rate: Number(rate?.rate), user: user })

                  if (!response.data || response.data.authorization_url == "") {
                        return {
                              status: false,
                              error: true,
                              message: `Cannot Generate Proceed With Checkout`
                        }
                  }

                  return {
                        status: true,
                        error: false,
                        message: "Payment initiated successfully",
                        checkout: response.data,
                        points: points,
                        platformFee: platformFee,
                  }

            } catch (err: any) {
                  console.log(err.message)
                  throw new Error(err.message)
            }
      }
      // Paystack payment 
      static async CreatePaystackPayment({ amount, platformFee, rate, user }: CreatePaystackPaymentProps): Promise<any> {
            try {
                  const referenceId = `PNT${GenerateUniqueId()}`
                  await query.userPointsPurchase.create({
                        data: {
                              purchase_id: referenceId,
                              user_id: user.id,
                              points: Number((amount - platformFee) / rate),
                              amount: amount,
                              success: false,
                        },
                  });
                  query.$disconnect();

                  const CreateOrder = await fetch(
                        "https://api.paystack.co/transaction/initialize",
                        {
                              method: "POST",
                              headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                              },
                              body: JSON.stringify({
                                    amount: amount * 100,
                                    email: user.email,
                                    reference: referenceId,
                                    callback_url: process.env.SERVER_ORIGINAL_URL + "/api/points/callback",
                              }),
                        }
                  );

                  const data = await CreateOrder.json();
                  return data
            } catch (error) {
                  console.log(error)
            }
      }
      // Payment callback
      static async PaystackPaymentCallBack({ reference }: { reference: string }): Promise<PaystackPaymentCallbackResponse> {
            try {
                  if (!reference) {
                        return { status: false, message: "Reference not found" };
                  }

                  // Verify Payment status in a single query
                  const purchase = await query.userPointsPurchase.findFirst({
                        where: { purchase_id: reference },
                  });

                  if (!purchase) {
                        return { status: false, message: "Purchase record not found" };
                  }

                  if (purchase.success) {
                        return { status: false, message: "These points are already updated" };
                  }

                  // Verify Payment on Paystack
                  const verificationResult = await this.verifyPayment(reference);

                  if (!verificationResult || !verificationResult.status) {
                        return { status: false, message: "Payment verification failed" };
                  }

                  // Use a transaction to ensure data consistency
                  return await query.$transaction(async (tx) => {
                        // Update purchase record
                        await tx.userPointsPurchase.update({
                              where: { purchase_id: reference },
                              data: { success: true },
                        });

                        // Add points to user's balance
                        await tx.userPoints.update({
                              where: { user_id: purchase.user_id },
                              data: {
                                    points: {
                                          increment: purchase.points,
                                    },
                              },
                        });

                        // Create notification
                        const notification_id = `NOT${GenerateUniqueId()}`;
                        await tx.notifications.create({
                              data: {
                                    notification_id,
                                    message: `Your Paypoints Purchase was successful, <strong>${purchase.points}</strong> points have been added to your balance.`,
                                    user_id: purchase.user_id,
                                    action: "purchase",
                                    url: "/wallet"
                              }
                        });

                        return { status: true, message: "Payment verified successfully" };
                  });
            } catch (err: any) {
                  console.error("Payment verification error:", err);
                  return { status: false, message: "An error occurred during payment verification" };
            } finally {
                  await query.$disconnect();
            }
      }

      // Helper function to verify payment
      static async verifyPayment(reference: string) {
            try {
                  const response = await fetch(
                        `https://api.paystack.co/transaction/verify/${reference}`,
                        {
                              headers: {
                                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                              },
                        }
                  );

                  if (response.status === 200) {
                        return await response.json();
                  }
                  return null;
            } catch (error) {
                  console.error("Paystack API error:", error);
                  return null;
            }
      }

      // Get Global POints
      static async GetGlobalPoints(): Promise<GetGlobalPointsResponse> {
            try {
                  const allPoints = await query.$transaction(async (tx) => {
                        const points = await tx.globalPointsBuy.findMany()
                        return points
                  })
                  return {
                        message: "Points retrieved successfully",
                        allPoints,
                        status: true
                  }
            }
            catch (err: any) {
                  console.log(err.message)
                  throw new Error(err.message)
            }
      }
      // Price per message
      static async PricePerMessage(userId: number): Promise<PricePerMessageResponse> {
            try {
                  const PriceKey = `price_per_message:${userId}`;
                  const price = await redis.get(PriceKey);
                  if (price) {
                        return {
                              message: "Price per message retrieved successfully",
                              price_per_message: Number(price),
                              status: true,
                        };
                  } else {
                        return {
                              message: "Price per message not found",
                              status: false,
                              price_per_message: 0,
                        }
                  }
            } catch (error: any) {
                  console.error(error);
                  throw new Error(error.message);
            }
      }
}
