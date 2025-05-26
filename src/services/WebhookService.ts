import { PutObjectCommand } from "@aws-sdk/client-s3";
import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";
import s3 from "@utils/s3";
import axios, { AxiosResponse } from "axios";
import { Buffer } from "buffer";
import sharp from "sharp";
import { PaystackService } from "./PaystackService";
// Retry intervals in milliseconds: 2 minutes, 4 minutes, 10 minutes, 30 minutes.
const RETRY_DELAYS = [120000, 240000, 600000, 1800000];
const MAX_RETRIES = 4;
export class WebhookService {
  // Handle Cloudflare processed media
  static async HandleCloudflareProcessedMedia(response: any): Promise<void> {
    try {
      console.log("Processing media:", response);
      const { uid, duration, readyToStream, thumbnail } = response;
      const mediaRecord = await query.userMedia.findUnique({
        where: { media_id: String(uid) },
        select: { post_id: true },
      });
      // If media record isn’t yet in the database, schedule a retry.
      if (!mediaRecord) {
        console.warn(`Media not found for ID ${uid}. Scheduling retry...`);
        return WebhookService.scheduleRetry(uid, response, 0);
      }
      const postRecord = await query.post.findUnique({
        where: { id: Number(mediaRecord.post_id) },
      });
      // If the post isn’t found, schedule a retry too.
      if (!postRecord) {
        console.warn(
          `Post not found for ID ${mediaRecord.post_id}. Scheduling retry...`,
        );
        return WebhookService.scheduleRetry(uid, response, 0);
      }
      async function fetchImageFile(thumbnail: string): Promise<Buffer> {
        try {
          const imgResponse: AxiosResponse<ArrayBuffer> = await axios.get(
            thumbnail,
            {
              responseType: "arraybuffer",
            },
          );
          const buffer = Buffer.from(imgResponse.data); // no need for 'binary' here
          return buffer;
        } catch (error) {
          console.error("Error fetching image:", error);
          throw new Error(`Failed to fetch image from ${thumbnail}`);
        }
      }
      // Example usage
      const fileKey = `thumbnails/blured/${postRecord.user_id}/${uid}`;

      const ImageBuffer = await sharp(await fetchImageFile(thumbnail))
        .resize(640)
        .blur(30)
        .webp({ quality: 80 })
        .toBuffer();

      // Upload the thumbnail to S3.
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: fileKey,
        Body: ImageBuffer,
        ContentType: "image/jpeg",
      });

      await s3.send(command);

      const bluredUrl = `${process.env.AWS_CLOUDFRONT_URL}/${fileKey}`;
      // Update the media record with the thumbnail URL.
      await query.userMedia.update({
        where: { media_id: uid },
        data: {
          poster: thumbnail,
          blur: bluredUrl,
        },
      });
      // Update the media record using the cloud-processed data.
      await query.userMedia.update({
        where: { media_id: String(uid) },
        data: {
          duration: String(duration),
          media_state: readyToStream ? "completed" : "processing",
          poster: thumbnail,
          blur: bluredUrl,
        },
      });
      // Check if all media for this post have been processed.
      const isAllMediaProcessed =
        await WebhookService.checkIfAllMediaProcessed(mediaRecord);
      if (isAllMediaProcessed) {
        console.log(
          `All media processed for post ${mediaRecord.post_id}, marking as approved.`,
        );
        await query.post.update({
          where: { id: Number(mediaRecord.post_id) },
          data: { post_status: "approved" },
        });
      }
    } catch (error) {
      console.error("Failed to process media:", error);
    }
  }
  // Schedule a retry.
  static async scheduleRetry(
    uid: string,
    response: any,
    attempt: number,
  ): Promise<void> {
    // Prevent scheduling if we've reached max number of retries.
    if (attempt >= MAX_RETRIES) {
      console.error(`Max retries reached for media ID ${uid}.`);
      return;
    }
    // Avoid duplicate scheduling.
    const existingRetry = await redis.get(`retry:media:${uid}`);
    if (existingRetry) return;
    const delay = RETRY_DELAYS[attempt] as number;
    const executeAt = Date.now() + delay; // timestamp when the retry should execute.
    console.log(
      `Scheduling retry for media ID ${uid} in ${delay / 1000
      } seconds. Attempt ${attempt + 1}`,
    );
    // Store the retry data along with the scheduled execution time.
    // The key will expire a bit after the intended run period to prevent stale data.
    await redis.setex(
      `retry:media:${uid}`,
      Math.ceil(delay / 1000) + 60,
      JSON.stringify({ response, attempt: attempt + 1, executeAt }),
    );
  }
  // Retry processor runs every minute.
  static async processRetries(): Promise<void> {
    const retryKeys = await redis.keys("retry:media:*");
    for (const key of retryKeys) {
      const mediaId = key.split(":")[2];
      const retryDataStr = await redis.get(key);
      if (!retryDataStr) continue;
      let retryData;
      try {
        retryData = JSON.parse(retryDataStr);
      } catch (parseErr) {
        console.error(`Error parsing retry data for ${mediaId}:`, parseErr);
        await redis.del(key);
        continue;
      }
      const { response, attempt, executeAt } = retryData;
      // Skip processing if it's not yet time.
      if (Date.now() < executeAt) {
        continue;
      }
      if (attempt > MAX_RETRIES) {
        console.warn(
          `Max retries reached for media ${mediaId}, stopping retries.`,
        );
        await redis.del(key);
        continue;
      }
      // Verify media record exists.
      const mediaRecord = await query.userMedia.findUnique({
        where: { media_id: String(mediaId) },
        select: { post_id: true },
      });
      if (!mediaRecord) continue;
      // If the post is already approved, cancel the retry.
      const post = await query.post.findUnique({
        where: { id: Number(mediaRecord.post_id) },
        select: { post_status: true },
      });
      if (post?.post_status === "approved") {
        console.log(
          `Post ${mediaRecord.post_id} already approved. Cancelling retry for media ${mediaId}.`,
        );
        await redis.del(key);
        continue;
      }
      console.log(
        `Retrying processing for media ${mediaId}, attempt ${attempt}`,
      );
      await WebhookService.HandleCloudflareProcessedMedia(response);
      await redis.del(key);
    }
  }
  // Check if all media for a given post are processed.
  static async checkIfAllMediaProcessed(mediaRecord: any): Promise<boolean> {
    try {
      const postId = Number(mediaRecord.post_id);
      if (!postId) return false;
      const postExists = await query.post.findUnique({
        where: { id: postId },
      });
      if (!postExists) {
        console.warn(`Post ID ${postId} not found, skipping approval check.`);
        return false;
      }
      // Get counts of total and completed media.
      const [totalMedia, completedMedia] = await Promise.all([
        query.userMedia.count({ where: { post_id: postId } }),
        query.userMedia.count({
          where: { post_id: postId, media_state: "completed" },
        }),
      ]);
      if (totalMedia === completedMedia) {
        await query.post.update({
          where: { id: postId },
          data: { post_status: "approved" },
        });
        return true;
      }
      console.log(
        `Post ${postId} still has ${totalMedia - completedMedia
        } media files processing.`,
      );
      return false;
    } catch (error) {
      console.error("Error in checkIfAllMediaProcessed:", error);
      return false;
    }
  }
  // Handle model signup callback
  // This function is called when a model signs up.
  // It initializes a payment for the model.
  static async HandleModelSignupCallback(reference: string): Promise<any> {
    try {
      const models = await query.model.findFirst({
        where: {
          payment_reference: reference,
        },
      });

      if (!models) {
        return {
          error: true,
          message: "Model not found",
        };
      }

      const validatePayment = await PaystackService.ValidatePayment(reference);

      if (validatePayment.error) {
        return {
          error: true,
          message: validatePayment.message,
        };
      }

      await query.model.update({
        where: {
          id: models.id,
        },
        data: {
          payment_status: true,
        },
      });

      return {
        error: false,
        message: "Verification Successful ",
        url: `${process.env.APP_URL}/verification?success=true`,
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}
// Run processRetries every minute.
setInterval(WebhookService.processRetries, 60000);
