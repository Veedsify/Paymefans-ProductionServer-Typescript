import query from '@utils/prisma';
import { CheckSubscriberResponse, GetSubscriptionDataResponse, CreateNewSubscriptionResponse, CheckSubscriberProps, CreateNewSubscriptionProps } from '../types/subscribers';
import { error } from 'console';
import { GenerateUniqueId } from '@utils/GenerateUniqueId';

export default class SubscriberService {
      static async CheckSubscriber({ main_user_id, user_id }: CheckSubscriberProps): Promise<CheckSubscriberResponse> {
            try {
                  if (!main_user_id || !user_id) {
                        return { error: false, status: false, message: "Invalid request" };
                  }

                  if (main_user_id === user_id) {
                        return { error: false, status: true, isSubscriber: true };
                  }

                  const subscriberData = await query.user.findFirst({
                        where: {
                              id: main_user_id,
                              Subscribers: {
                                    some: {
                                          subscriber_id: user_id
                                    }
                              }
                        }
                  });

                  if (!subscriberData) {
                        return { error: false, status: true, isSubscriber: false };
                  }

                  return { error: false, status: true, isSubscriber: true };
            } catch (error) {
                  console.log(error);
                  return { error: true, status: false, message: "An error occured" };
            }
      }
      static async GetSubscriptionData(user_id: string): Promise<GetSubscriptionDataResponse> {
            try {
                  const subscriberData = await query.user.findFirst({
                        where: {
                              user_id: user_id
                        },
                        select: {
                              id: true,
                              username: true,
                              name: true,
                              user_id: true,
                              profile_image: true,
                              Model: {
                                    select: {
                                          gender: true,
                                    }
                              },
                              Settings: {
                                    select: {
                                          subscription_price: true,
                                          subscription_duration: true
                                    }
                              },
                              ModelSubscriptionPack: {
                                    select: {
                                          ModelSubscriptionTier: true
                                    }
                              }
                        }
                  });

                  if (!subscriberData) {
                        return { error: false, status: false, message: "User not found", data: {} }
                  }

                  return {
                        error: false,
                        status: true,
                        data: subscriberData
                  };

            } catch (error) {
                  console.log(error);
                  throw new Error("An error occured");
            }
      }


      static async CreateNewSubscription({ profileid, tier_id, user: authuser }: CreateNewSubscriptionProps): Promise<CreateNewSubscriptionResponse> {
            const transaction = await query.$transaction(async (prisma) => {
                  try {
                        // Fetch the user data
                        const userdata = await prisma.user.findFirst({
                              where: { id: authuser.id },
                              select: {
                                    id: true,
                                    user_id: true,
                                    UserPoints: {
                                          select: {
                                                points: true,
                                          },
                                    },
                              },
                        });

                        // Fetch the profile data
                        const profileData = await prisma.user.findFirst({
                              where: {
                                    user_id: profileid,
                              },
                              select: {
                                    id: true,
                                    user_id: true,
                                    ModelSubscriptionPack: {
                                          select: {
                                                ModelSubscriptionTier: {
                                                      where: {
                                                            id: Number(tier_id),
                                                      },
                                                      select: {
                                                            tier_price: true,
                                                      },
                                                },
                                          },
                                    },
                                    Settings: {
                                          select: {
                                                subscription_price: true,
                                                subscription_duration: true,
                                          },
                                    },
                              },
                        });

                        if (!profileData || !userdata) {
                              return { status: false, message: 'User not found', error: true };
                        }

                        // Check if user is already subscribed
                        const checkSubscription = await prisma.subscribers.findFirst({
                              where: {
                                    user_id: profileData.id,
                                    subscriber_id: userdata.id,
                              },
                        });

                        if (checkSubscription) {
                              return { status: false, message: 'You are already subscribed to this user', error: false };
                        }

                        // Check if user has enough points
                        const tierPrice = profileData.ModelSubscriptionPack?.ModelSubscriptionTier[0].tier_price ?? 0;
                        if (tierPrice > userdata.UserPoints?.points!) {
                              return { status: false, message: "You don't have enough points to subscribe to this user", error: false };
                        }

                        // Create subscription
                        const createSubscription = await prisma.subscribers.create({
                              data: {
                                    user_id: profileData.id,
                                    subscriber_id: userdata.id,
                                    sub_id: `SUB${GenerateUniqueId()}`,
                              },
                        });

                        if (!createSubscription) {
                              return { status: false, message: 'An error occurred', error: true };
                        }

                        // Update points for both the user and the model
                        const updateUserPoints = prisma.user.update({
                              where: { id: userdata.id },
                              data: {
                                    UserPoints: {
                                          update: {
                                                points: {
                                                      decrement: tierPrice,
                                                },
                                          },
                                    },
                              },
                        });

                        const updateModelPoints = prisma.user.update({
                              where: { id: profileData.id },
                              data: {
                                    UserPoints: {
                                          update: {
                                                points: {
                                                      increment: tierPrice,
                                                },
                                          },
                                    },
                              },
                        });

                        await Promise.all([updateUserPoints, updateModelPoints]);

                        return { status: true, message: 'Subscription successful', error: false };

                  } catch (error) {
                        console.log(error);
                        throw new Error('An error occurred');
                  }
            });

            return transaction;
      }

}
