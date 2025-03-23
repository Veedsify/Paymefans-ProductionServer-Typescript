import { RetrieveUserResponse } from "../types/user";
import query from "@utils/prisma";

export default class UserService {
      static async RetrieveUser(userid: number): Promise<RetrieveUserResponse> {
            try {
                  const result = await query.$transaction(async (tx) => {
                        const user = await tx.user.findUnique({
                              where: {
                                    id: userid
                              },
                              include: {
                                    UserPoints: true,
                                    UserWallet: true,
                                    Settings: true,
                                    Model: true,
                                    _count: {
                                          select: {
                                                Follow: {
                                                      where: {
                                                            user_id: userid
                                                      }
                                                },
                                                Subscribers: {
                                                      where: {
                                                            user_id: userid
                                                      }
                                                }
                                          },
                                    }
                              }
                        });

                        if (!user) {
                              return { message: "User not found", status: false };
                        }

                        const following = await tx.user.count({
                              where: {
                                    Follow: {
                                          some: {
                                                follower_id: userid
                                          }
                                    }
                              }
                        });

                        const getMySubscriptions = await tx.subscribers.findMany({
                              where: {
                                    subscriber_id: userid
                              },
                              select: {
                                    user_id: true
                              }
                        });

                        const { password, ...rest } = user;
                        const subscriptions = getMySubscriptions.map(sub => sub.user_id);
                        const purchasedPosts: number[] = [2];

                        return {
                              user: { ...rest, following, subscriptions, purchasedPosts },
                              status: true
                        };
                  });

                  return result;
            } catch (error) {
                  console.log(error);
                  return { message: "Internal server error", status: false };
            }
      }
}
