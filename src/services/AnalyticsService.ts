import query from "@utils/prisma";
import { redis } from "@libs/RedisStore";

type TimeRangeKey = "24hrs" | "48hrs" | "3days" | "7days" | "1month" | "3months" | "6months" | "alltime";

interface AccountGrowthData {
    name: string;
    followers: number;
}

interface EngagementData {
    name: string;
    likes: number;
    comments: number;
    views: number;
}

interface AudienceData {
    name: string;
    value: number;
}

interface RecentPostData {
    id: number;
    thumbnail: string;
    likes: number;
    comments: number;
    views: number;
    shares: number;
    engagement: number;
    date: string;
    timestamp: number;
}

interface MetricsData {
    followers: { value: string; trend: number };
    views: { value: string; trend: number };
    engagement: { value: string; trend: number };
    comments: { value: string; trend: number };
}

class AnalyticsService {
    // Cache TTL in seconds
    private static readonly CACHE_TTL = {
        SHORT: 300,    // 5 minutes
        MEDIUM: 900,   // 15 minutes
        LONG: 1800     // 30 minutes
    };

    // Helper function to generate cache keys
    private static getCacheKey(prefix: string, userId: number, timeRange?: TimeRangeKey): string {
        return timeRange ? `analytics:${prefix}:${userId}:${timeRange}` : `analytics:${prefix}:${userId}`;
    }

    // Helper function to get cached data or execute query
    private static async getCachedOrExecute<T>(
        cacheKey: string,
        ttl: number,
        queryFn: () => Promise<T>
    ): Promise<T> {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            console.warn('Redis cache read error:', error);
        }

        const result = await queryFn();

        try {
            await redis.setex(cacheKey, ttl, JSON.stringify(result));
        } catch (error) {
            console.warn('Redis cache write error:', error);
        }

        return result;
    }

    // Helper function to get date range based on time range
    private static getDateRange(timeRange: TimeRangeKey): { startDate: Date; endDate: Date } {
        const now = new Date();
        const endDate = new Date(now);
        let startDate = new Date(now);

        switch (timeRange) {
            case "24hrs":
                startDate.setHours(now.getHours() - 24);
                break;
            case "48hrs":
                startDate.setHours(now.getHours() - 48);
                break;
            case "3days":
                startDate.setDate(now.getDate() - 3);
                break;
            case "7days":
                startDate.setDate(now.getDate() - 7);
                break;
            case "1month":
                startDate.setMonth(now.getMonth() - 1);
                break;
            case "3months":
                startDate.setMonth(now.getMonth() - 3);
                break;
            case "6months":
                startDate.setMonth(now.getMonth() - 6);
                break;
            case "alltime":
                startDate = new Date(2020, 0, 1); // Set to a very early date
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        return { startDate, endDate };
    }

    // Helper function to format numbers
    private static formatNumber(num: number): string {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Get Account Growth Data
    static async GetAccountGrowthData(userId: number, timeRange: TimeRangeKey): Promise<AccountGrowthData[]> {
        const cacheKey = this.getCacheKey('account-growth', userId, timeRange);

        return this.getCachedOrExecute(cacheKey, this.CACHE_TTL.MEDIUM, async () => {
            const { startDate, endDate } = this.getDateRange(timeRange);

            // Get current follower count
            const user = await query.user.findUnique({
                where: { id: userId },
                select: {
                    total_followers: true,
                    created_at: true
                }
            });

            if (!user) return [];

            // Get follower growth data from Follow table
            const followData = await query.follow.groupBy({
                by: ['created_at'],
                where: {
                    user_id: userId,
                    created_at: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                _count: {
                    id: true
                },
                orderBy: {
                    created_at: 'asc'
                }
            });

            const currentFollowers = user.total_followers;

            // If we have real follow data, use it; otherwise simulate
            if (followData.length > 0) {
                return this.processFollowerGrowthData(followData, timeRange, currentFollowers);
            } else {
                return this.generateSimulatedGrowthData(timeRange, currentFollowers);
            }
        });
    }

    // Process real follower growth data
    private static processFollowerGrowthData(followData: any[], timeRange: TimeRangeKey, currentFollowers: number): AccountGrowthData[] {
        const data: AccountGrowthData[] = [];
        let runningTotal = Math.max(0, currentFollowers - followData.length);

        switch (timeRange) {
            case "7days":
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const dailyFollows = this.groupByDay(followData);

                for (let i = 0; i < 7; i++) {
                    const dayFollows = dailyFollows[i] || 0;
                    runningTotal += dayFollows;
                    data.push({
                        name: days[i],
                        followers: runningTotal
                    });
                }
                break;
            default:
                return this.generateSimulatedGrowthData(timeRange, currentFollowers);
        }

        return data;
    }

    // Generate simulated growth data when no real data is available
    private static generateSimulatedGrowthData(timeRange: TimeRangeKey, currentFollowers: number): AccountGrowthData[] {
        const data: AccountGrowthData[] = [];

        switch (timeRange) {
            case "24hrs":
                for (let i = 0; i < 6; i++) {
                    const hour = i * 4;
                    const followers = Math.max(0, currentFollowers - Math.floor(Math.random() * 50) + (i * 10));
                    data.push({
                        name: `${hour.toString().padStart(2, '0')}:00`,
                        followers
                    });
                }
                break;
            case "48hrs":
                data.push(
                    { name: "Day 1", followers: Math.max(0, currentFollowers - 50) },
                    { name: "Day 2", followers: currentFollowers }
                );
                break;
            case "3days":
                for (let i = 0; i < 3; i++) {
                    data.push({
                        name: `Day ${i + 1}`,
                        followers: Math.max(0, currentFollowers - (2 - i) * 30)
                    });
                }
                break;
            case "7days":
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                for (let i = 0; i < 7; i++) {
                    data.push({
                        name: days[i],
                        followers: Math.max(0, currentFollowers - (6 - i) * 20)
                    });
                }
                break;
            case "1month":
                for (let i = 0; i < 4; i++) {
                    data.push({
                        name: `Week ${i + 1}`,
                        followers: Math.max(0, currentFollowers - (3 - i) * 100)
                    });
                }
                break;
            case "3months":
                for (let i = 0; i < 3; i++) {
                    data.push({
                        name: `Month ${i + 1}`,
                        followers: Math.max(0, currentFollowers - (2 - i) * 300)
                    });
                }
                break;
            case "6months":
                for (let i = 0; i < 6; i++) {
                    data.push({
                        name: `Month ${i + 1}`,
                        followers: Math.max(0, currentFollowers - (5 - i) * 200)
                    });
                }
                break;
            case "alltime":
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                for (let i = 0; i < 12; i++) {
                    data.push({
                        name: months[i],
                        followers: Math.max(0, Math.floor(currentFollowers * (i + 1) / 12))
                    });
                }
                break;
        }

        return data;
    }

    // Helper function to group follows by day
    private static groupByDay(followData: any[]): number[] {
        const dailyCounts = new Array(7).fill(0);
        const now = new Date();

        followData.forEach(follow => {
            const followDate = new Date(follow.created_at);
            const daysDiff = Math.floor((now.getTime() - followDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff >= 0 && daysDiff < 7) {
                dailyCounts[6 - daysDiff] += follow._count.id;
            }
        });

        return dailyCounts;
    }

    // Get Engagement Data
    static async GetEngagementData(userId: number, timeRange: TimeRangeKey): Promise<EngagementData[]> {
        const cacheKey = this.getCacheKey('engagement', userId, timeRange);

        return this.getCachedOrExecute(cacheKey, this.CACHE_TTL.SHORT, async () => {
            const { startDate, endDate } = this.getDateRange(timeRange);

            // Get actual post engagement data with real view counts from PostImpression table
            const posts = await query.post.findMany({
                where: {
                    user_id: userId,
                    created_at: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                select: {
                    id: true,
                    post_likes: true,
                    post_comments: true,
                    post_impressions: true,
                    created_at: true,
                    PostImpression: {
                        where: {
                            created_at: {
                                gte: startDate,
                                lte: endDate
                            }
                        },
                        select: {
                            id: true,
                            created_at: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'asc'
                }
            });

            // Aggregate data based on time range
            const data: EngagementData[] = [];

            if (posts.length === 0) {
                // Return sample data if no posts found
                return this.getSampleEngagementData(timeRange);
            }

            // Group posts by time periods and aggregate
            switch (timeRange) {
                case "24hrs":
                    for (let i = 0; i < 6; i++) {
                        const hour = i * 4;
                        const periodPosts = posts.filter(post => {
                            const postHour = post.created_at.getHours();
                            return postHour >= hour && postHour < hour + 4;
                        });

                        const periodViews = periodPosts.reduce((sum, post) => {
                            const viewsInPeriod = post.PostImpression.filter(view => {
                                const viewHour = view.created_at.getHours();
                                return viewHour >= hour && viewHour < hour + 4;
                            }).length;
                            return sum + viewsInPeriod;
                        }, 0);

                        data.push({
                            name: `${hour.toString().padStart(2, '0')}:00`,
                            likes: periodPosts.reduce((sum, post) => sum + post.post_likes, 0),
                            comments: periodPosts.reduce((sum, post) => sum + post.post_comments, 0),
                            views: periodViews || periodPosts.reduce((sum, post) => sum + post.post_impressions, 0)
                        });
                    }
                    break;
                case "7days":
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    for (let i = 0; i < 7; i++) {
                        const dayStart = new Date(startDate);
                        dayStart.setDate(startDate.getDate() + i);
                        const dayEnd = new Date(dayStart);
                        dayEnd.setDate(dayStart.getDate() + 1);

                        const dayPosts = posts.filter(post =>
                            post.created_at >= dayStart && post.created_at < dayEnd
                        );

                        const dayViews = dayPosts.reduce((sum, post) => {
                            const viewsInDay = post.PostImpression.filter(view =>
                                view.created_at >= dayStart && view.created_at < dayEnd
                            ).length;
                            return sum + viewsInDay;
                        }, 0);

                        data.push({
                            name: days[i],
                            likes: dayPosts.reduce((sum, post) => sum + post.post_likes, 0),
                            comments: dayPosts.reduce((sum, post) => sum + post.post_comments, 0),
                            views: dayViews || dayPosts.reduce((sum, post) => sum + post.post_impressions, 0)
                        });
                    }
                    break;
                default:
                    return this.getSampleEngagementData(timeRange);
            }

            return data;
        });
    }

    // Get sample engagement data when no real data is available
    private static getSampleEngagementData(timeRange: TimeRangeKey): EngagementData[] {
        const data: EngagementData[] = [];

        switch (timeRange) {
            case "24hrs":
                for (let i = 0; i < 6; i++) {
                    const hour = i * 4;
                    data.push({
                        name: `${hour.toString().padStart(2, '0')}:00`,
                        likes: Math.floor(Math.random() * 100) + 20,
                        comments: Math.floor(Math.random() * 30) + 5,
                        views: Math.floor(Math.random() * 500) + 100
                    });
                }
                break;
            case "7days":
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                for (let i = 0; i < 7; i++) {
                    data.push({
                        name: days[i],
                        likes: Math.floor(Math.random() * 300) + 100,
                        comments: Math.floor(Math.random() * 100) + 20,
                        views: Math.floor(Math.random() * 2000) + 500
                    });
                }
                break;
            // Add more cases as needed
        }

        return data;
    }

    // Get Audience Demographics
    static async GetAudienceData(userId: number): Promise<AudienceData[]> {
        const cacheKey = this.getCacheKey('audience', userId);

        return this.getCachedOrExecute(cacheKey, this.CACHE_TTL.LONG, async () => {
            // Get follower demographics - for now we'll use sample data
            // In a real implementation, you could analyze follower data or use external analytics

            // You could potentially get some insights from follower locations or other data
            const followers = await query.follow.findMany({
                where: { user_id: userId },
                include: {
                    followers: {
                        select: {
                            country: true,
                            created_at: true
                        }
                    }
                },
                take: 1000 // Sample for performance
            });

            // For now, return sample data but you could analyze follower data here
            // to provide real demographics based on available user data
            return [
                { name: "18-24", value: 25 },
                { name: "25-34", value: 40 },
                { name: "35-44", value: 20 },
                { name: "45-54", value: 10 },
                { name: "55+", value: 5 }
            ];
        });
    }

    // Get Recent Posts Data
    static async GetRecentPostsData(userId: number, timeRange: TimeRangeKey): Promise<RecentPostData[]> {
        const cacheKey = this.getCacheKey('recent-posts', userId, timeRange);

        return this.getCachedOrExecute(cacheKey, this.CACHE_TTL.SHORT, async () => {
            const { startDate, endDate } = this.getDateRange(timeRange);

            const posts = await query.post.findMany({
                where: {
                    user_id: userId,
                    created_at: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                select: {
                    id: true,
                    post_likes: true,
                    post_comments: true,
                    post_impressions: true,
                    post_reposts: true,
                    created_at: true,
                    UserMedia: {
                        select: {
                            url: true,
                            media_type: true
                        },
                        take: 1
                    },
                    PostImpression: {
                        select: {
                            id: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                },
                take: 10
            });

            return posts.map(post => {
                const realViews = post.PostImpression.length || post.post_impressions;
                const totalEngagement = post.post_likes + post.post_comments + post.post_reposts;
                const engagementRate = realViews > 0
                    ? ((totalEngagement / realViews) * 100)
                    : 0;

                return {
                    id: post.id,
                    thumbnail: post.UserMedia[0]?.url || "/site/avatar.png",
                    likes: post.post_likes,
                    comments: post.post_comments,
                    views: realViews,
                    shares: post.post_reposts,
                    engagement: Math.round(engagementRate * 10) / 10,
                    date: this.getRelativeTime(post.created_at),
                    timestamp: post.created_at.getTime()
                };
            });
        });
    }

    // Get Metrics Summary
    static async GetMetricsData(userId: number, timeRange: TimeRangeKey): Promise<MetricsData> {
        const cacheKey = this.getCacheKey('metrics', userId, timeRange);

        return this.getCachedOrExecute(cacheKey, this.CACHE_TTL.SHORT, async () => {
            const { startDate, endDate } = this.getDateRange(timeRange);

            // Get current user data
            const user = await query.user.findUnique({
                where: { id: userId },
                select: {
                    total_followers: true,
                    created_at: true
                }
            });

            // Get posts data for the period with real view counts
            const posts = await query.post.findMany({
                where: {
                    user_id: userId,
                    created_at: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                select: {
                    post_likes: true,
                    post_comments: true,
                    post_impressions: true,
                    PostImpression: {
                        where: {
                            created_at: {
                                gte: startDate,
                                lte: endDate
                            }
                        },
                        select: {
                            id: true
                        }
                    }
                }
            });

            // Get profile views for the period
            const profileViews = await query.profileView.count({
                where: {
                    profile_id: userId,
                    created_at: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            // Calculate totals using real view data
            const totalRealViews = posts.reduce((sum, post) => sum + post.PostImpression.length, 0);
            const totalViews = totalRealViews || posts.reduce((sum, post) => sum + post.post_impressions, 0);
            const totalLikes = posts.reduce((sum, post) => sum + post.post_likes, 0);
            const totalComments = posts.reduce((sum, post) => sum + post.post_comments, 0);
            const totalEngagement = totalLikes + totalComments;
            const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;
            const avgComments = posts.length > 0 ? totalComments / posts.length : 0;

            // Calculate trends by comparing with previous period
            const previousPeriod = this.getPreviousPeriod(startDate, endDate);
            const previousMetrics = await this.getPreviousPeriodMetrics(userId, previousPeriod.startDate, previousPeriod.endDate);

            const followerTrend = this.calculateTrend(user?.total_followers || 0, previousMetrics.followers);
            const viewsTrend = this.calculateTrend(totalViews + profileViews, previousMetrics.views);
            const engagementTrend = this.calculateTrend(engagementRate, previousMetrics.engagementRate);
            const commentsTrend = this.calculateTrend(avgComments, previousMetrics.avgComments);

            return {
                followers: {
                    value: this.formatNumber(user?.total_followers || 0),
                    trend: Math.round(followerTrend * 10) / 10
                },
                views: {
                    value: this.formatNumber(totalViews + profileViews),
                    trend: Math.round(viewsTrend * 10) / 10
                },
                engagement: {
                    value: `${Math.round(engagementRate * 10) / 10}%`,
                    trend: Math.round(engagementTrend * 10) / 10
                },
                comments: {
                    value: Math.round(avgComments).toString(),
                    trend: Math.round(commentsTrend * 10) / 10
                }
            };
        });
    }

    // Helper function to get previous period dates
    private static getPreviousPeriod(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
        const periodLength = endDate.getTime() - startDate.getTime();
        const previousEndDate = new Date(startDate.getTime() - 1);
        const previousStartDate = new Date(previousEndDate.getTime() - periodLength);

        return { startDate: previousStartDate, endDate: previousEndDate };
    }

    // Helper function to get metrics for previous period
    private static async getPreviousPeriodMetrics(userId: number, startDate: Date, endDate: Date) {
        const posts = await query.post.findMany({
            where: {
                user_id: userId,
                created_at: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                post_likes: true,
                post_comments: true,
                post_impressions: true,
                PostImpression: {
                    where: {
                        created_at: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    select: {
                        id: true
                    }
                }
            }
        });

        const profileViews = await query.profileView.count({
            where: {
                profile_id: userId,
                created_at: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        const totalRealViews = posts.reduce((sum, post) => sum + post.PostImpression.length, 0);
        const totalViews = totalRealViews || posts.reduce((sum, post) => sum + post.post_impressions, 0);
        const totalLikes = posts.reduce((sum, post) => sum + post.post_likes, 0);
        const totalComments = posts.reduce((sum, post) => sum + post.post_comments, 0);
        const totalEngagement = totalLikes + totalComments;
        const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;
        const avgComments = posts.length > 0 ? totalComments / posts.length : 0;

        return {
            followers: 0, // We don't track historical follower counts
            views: totalViews + profileViews,
            engagementRate,
            avgComments
        };
    }

    // Helper function to calculate trend percentage
    private static calculateTrend(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    // Helper function to get relative time
    private static getRelativeTime(date: Date): string {
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const diffInWeeks = Math.floor(diffInDays / 7);
        const diffInMonths = Math.floor(diffInDays / 30);

        if (diffInDays === 0) return "Today";
        if (diffInDays === 1) return "1 day ago";
        if (diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInWeeks === 1) return "1 week ago";
        if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
        if (diffInMonths === 1) return "1 month ago";
        return `${diffInMonths} months ago`;
    }
}

export default AnalyticsService;