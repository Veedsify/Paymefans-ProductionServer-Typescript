import { PutObjectCommand } from "@aws-sdk/client-s3";
import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";
import s3 from "@utils/s3";
import axios, { AxiosResponse } from "axios";
import { Buffer } from "buffer";
import sharp from "sharp";
import { PaystackService } from "./PaystackService";
import { GenerateStreamToken } from "@libs/GenerateSignedUrls";
// Retry intervals in milliseconds: 2 minutes, 4 minutes, 10 minutes, 30 minutes.
const RETRY_DELAYS = [60_000, 120_000, 240_000, 600_000, 1_800_000];
const CLOUDFLARE_CUSTOMER_DOMAIN = process.env.CLOUDFLARE_CUSTOMER_DOMAIN;
const MAX_RETRIES = 4;
export class WebhookService {
  // Handle Cloudflare processed media
  static async HandleCloudflareProcessedMedia(response: any): Promise<void> {
    try {
      const { uid, duration, readyToStream } = response;
      const token = await GenerateStreamToken(uid);
      const thumbnail = `${CLOUDFLARE_CUSTOMER_DOMAIN}${token}/thumbnails/thumbnail.jpg`;
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
      const bluredFileKey = `thumbnails/blured/${postRecord.user_id}/${uid}`;
      const fileKey = `thumbnails/public/${postRecord.user_id}/${uid}`;

      const ImageBlurBuffer = await sharp(await fetchImageFile(thumbnail))
        .resize(800)
        .blur(30)
        .webp({ quality: 80 })
        .toBuffer();

      const ImageBuffer = await sharp(await fetchImageFile(thumbnail))
        .resize(640)
        .webp({ quality: 100 })
        .toBuffer();

      // Upload the thumbnail to S3.
      const [blurCommand, publicCommand] = [
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: bluredFileKey,
          Body: ImageBlurBuffer,
          ContentType: "image/webp", // Changed to webp since you're converting to webp
        }),
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: fileKey,
          Body: ImageBuffer,
          ContentType: "image/webp", // Changed to webp since you're converting to webp
        }),
      ];

      await Promise.all([s3.send(blurCommand), s3.send(publicCommand)]);

      const bluredUrl = `${process.env.AWS_CLOUDFRONT_URL}/${bluredFileKey}`;
      const publicUrl = `${process.env.AWS_CLOUDFRONT_URL}/${fileKey}`;

      // Update the media record with processed data and thumbnails
      await query.userMedia.update({
        where: { media_id: uid },
        data: {
          duration: String(duration),
          media_state: readyToStream ? "completed" : "processing",
          poster: publicUrl,
          blur: bluredUrl,
        },
      });
      // Check if all media for this post have been processed.
      const isAllMediaProcessed =
        await WebhookService.checkIfAllMediaProcessed(mediaRecord);
      if (isAllMediaProcessed) {
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
    // Store the retry data along with the scheduled execution time.
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
        await redis.del(key);
        continue;
      }
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
      return false;
    } catch (error) {
      console.error("Error in checkIfAllMediaProcessed:", error);
      return false;
    }
  }
  // Handle model signup callback
  // This function is called when a model signs up.
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

  // Handle Complete Media processing
  static async HandleMediaProcessingComplete(
    response: HandleCompleteMediaParams,
  ): Promise<void> {
    const mediaId = response.media_id;
    const mediaRecord = await query.uploadedMedia.findUnique({
      where: { media_id: String(mediaId) },
    });

    if (!mediaRecord) {
      console.warn(`Uploaded media not found for ID ${mediaId}.`);
      return;
    }

    await query.uploadedMedia.update({
      where: { media_id: String(mediaId) },
      data: {
        media_state: "completed",
      },
    });

    redis.publish(`media:processed:${mediaRecord.user_id}`, mediaId);
  }
}
// Run processRetries every minute.
setInterval(WebhookService.processRetries, 60000);
