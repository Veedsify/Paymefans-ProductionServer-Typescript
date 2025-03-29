import redis from "@libs/RedisStore";
import query from "@utils/prisma";

// Retry intervals: 2 minutes, 4 minutes, 10 minutes, 30 minutes
const RETRY_DELAYS = [120000, 240000, 600000, 1800000];
const MAX_RETRIES = 4;

export class WebhookService {
    // Handle Cloudflare processed media
    static async HandleCloudflareProcessedMedia(response: any): Promise<void> {
        try {
            const { uid, duration, readyToStream, thumbnail } = response;

            const mediaRecord = await query.userMedia.findUnique({
                where: { media_id: String(uid) },
                select: { post_id: true }
            });

            if (!mediaRecord) {
                console.warn(`Media not found for ID ${uid}. Scheduling retry...`);
                return this.scheduleRetry(uid, response, 0);
            }

            const postExists = await query.post.findUnique({
                where: { id: Number(mediaRecord.post_id) }
            });

            if (!postExists) {
                console.warn(`Post not found for ID ${mediaRecord.post_id}. Scheduling retry...`);
                return this.scheduleRetry(uid, response, 0);
            }

            // Update media record
            await query.userMedia.update({
                where: { media_id: String(uid) },
                data: {
                    duration: String(duration),
                    media_state: readyToStream ? "completed" : "processing",
                    poster: String(thumbnail)
                }
            });

            // Remove retry tracking
            await redis.del(`retry:media:${uid}`);

            // Check if all media is processed
            await this.checkIfAllMediaProcessed(mediaRecord);
        } catch (error) {
            console.error("Failed to process media", error);
        }
    }

    // Schedule retries
    static async scheduleRetry(uid: string, response: any, attempt: number): Promise<void> {
        if (attempt >= MAX_RETRIES) {
            console.error(`Max retries reached for media ID ${uid}.`);
            return;
        }

        // Avoid duplicate scheduling
        const existingRetry = await redis.get(`retry:media:${uid}`);
        if (existingRetry) return;

        const delay = RETRY_DELAYS[attempt];
        console.log(`Retrying in ${delay / 1000} seconds for media ID ${uid}. Attempt ${attempt + 1}`);

        // Store retry data
        await redis.setex(`retry:media:${uid}`, delay / 1000 + 60, JSON.stringify({ response, attempt: attempt + 1 }));
    }

    // Retry processor
    static async processRetries(): Promise<void> {
        const retryKeys = await redis.keys("retry:media:*");

        for (const key of retryKeys) {
            const mediaId = key.split(":")[2];
            const retryData = await redis.get(key);

            if (!retryData) continue;

            const { response, attempt } = JSON.parse(retryData);

            if (attempt >= MAX_RETRIES) {
                console.warn(`Max retries reached for media ${mediaId}, stopping retries.`);
                await redis.del(key);
                continue;
            }

            const mediaRecord = await query.userMedia.findUnique({
                where: { media_id: String(mediaId) },
                select: { post_id: true }
            });

            if (!mediaRecord) continue;

            const post = await query.post.findUnique({
                where: { id: Number(mediaRecord.post_id) },
                select: { post_status: true }
            });

            if (post?.post_status === "approved") {
                console.log(`Post ${mediaRecord.post_id} already approved. Stopping retries.`);
                await redis.del(key);
                continue;
            }

            console.log(`Retrying processing for media ${mediaId}, attempt ${attempt + 1}`);
            await this.HandleCloudflareProcessedMedia(response);

            await redis.incr(key);
        }
    }

    // Check if all media is processed
    static async checkIfAllMediaProcessed(mediaRecord: any): Promise<boolean> {
        try {
            const postId = Number(mediaRecord.post_id);
            if (!postId) return false;

            // Check if post exists
            const postExists = await query.post.findUnique({
                where: { id: postId }
            });

            if (!postExists) {
                console.warn(`Post ID ${postId} not found, skipping approval check.`);
                return false;
            }

            // Count media in database (not Redis)
            const [totalMedia, completedMedia] = await Promise.all([
                query.userMedia.count({
                    where: { post_id: postId }
                }),
                query.userMedia.count({
                    where: { post_id: postId, media_state: "completed" }
                })
            ]);

            if (totalMedia === completedMedia) {
                await query.post.update({
                    where: { id: postId },
                    data: { post_status: "approved" }
                });

                console.log(`All media processed for post ${postId}, marked as approved.`);
                return true;
            }

            console.log(`Post ${postId} still has ${totalMedia - completedMedia} media files processing.`);
            return false;

        } catch (error) {
            console.error("Error in checkIfAllMediaProcessed:", error);
            return false;
        }
    }
}

// Run processRetries every minute
setInterval(WebhookService.processRetries, 60000);
