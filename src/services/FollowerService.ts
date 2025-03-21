import query from "@utils/prisma"
import { CheckFollowerProps, CheckFollowerResponse, GetAllFollowersProps, GetAllFollowersResponse } from "../types/follower";

export default class FollowerService {
    // Check Follower
    static async CheckFollower(body: CheckFollowerProps): Promise<CheckFollowerResponse> {
        try {
            const { userId, followerId } = body;
            const getFollower = await query.follow.findMany({
                where: {
                    user_id: Number(userId),
                    follower_id: Number(followerId)
                }
            })

            if (!getFollower) {
                return {
                    status: false,
                    message: "Follower not found",
                    followers: [],
                    error: true,
                }
            }
            return {
                status: true,
                message: "Followers Retrieved",
                followers: getFollower,
                error: false,
            }
        } catch (err: any) {
            return {
                status: false,
                message: "Follower not found",
                followers: [],
                error: true,
            }
        }
    }

    // Get All Followers
    static async GetAllFollowers({ query: bodyQuery, user }: GetAllFollowersProps): Promise<GetAllFollowersResponse> {
        try {
            const min = parseInt(bodyQuery.min) 
            const max = parseInt(bodyQuery.max);
            if(!min && !max){
                return {
                    status: false,
                    error: true,
                    message: `Min & Max Required`,
                    minmax: "",
                    followers: []
                }
            }
            const followers = []
            const myFollowers = await query.follow.findMany({
                where: {
                    user_id: user.id
                },
                orderBy: {
                    created_at: "desc"
                },
                skip: min === 0 ? 0 : min - 1,
                take: max
            });

            for (let i = 0; i < myFollowers.length; i++) {
                const user = await query.user.findUnique({
                    where: {
                        id: myFollowers[i].follower_id
                    },
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        fullname: true,
                        profile_image: true,
                    }
                });
                const meFollowing = await query.follow.findFirst({
                    where: {
                        user_id: user?.id,
                        follower_id: user?.id
                    }
                });

                followers.push({
                    user,
                    iAmFollowing: meFollowing ? true : false
                });
            }

            const minmax = bodyQuery.min + " - " + bodyQuery.max

            return {
                status: true,
                followers: followers,
                minmax,
                error: false,
                message: `Followers Retrieved Successfully`
            };
        } catch (error) {
            console.log(error);
            return {
                status: false,
                error: true,
                message: `An error occured while getting followers`,
                minmax: "",
                followers: []
            }
        }
    }
}
