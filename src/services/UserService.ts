import { RetrieveUserResponse } from "../types/user";
import query from "../utils/prisma";

export default class UserService {
      static async RetrieveUser(userid: number): Promise<RetrieveUserResponse> {
            try {
                  const user = await query.user.findUnique({
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

                  const following = await query.user.count({
                        where: {
                              Follow: {
                                    some: {
                                          follower_id: userid
                                    }
                              }
                        }
                  });

                  if (user) {
                        const { password, ...rest } = user;
                        const data = { user: { ...rest, following }, status: true };
                        return data
                  } else {
                        return { message: "User not found", status: false }
                  }
            } catch (error) {
                  console.log(error);
                  return { message: "Internal server error", status: false };
            }
      }
}
