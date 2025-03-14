import fs from "fs";
import sharp, { ResizeOptions } from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import s3 from "../utils/s3";

export interface UploadOptions {
      file: Express.Multer.File; // File from Multer
      folder?: string; // S3 folder (e.g., "banners", "avatars")
      resize?: { width: number; height: number; fit?: sharp.FitEnum | string; position?: number | string | undefined }; // Resize options
      format?: "webp" | "jpeg" | "png" | "avif"  // Image format
      quality?: number; // Image compression quality (1-100)
      contentType?: string; // Custom Content-Type (e.g., "image/png", "video/mp4")
      saveToDb?: boolean; // Whether to trigger callback after upload
      deleteLocal?: boolean; // Delete local files after upload
      onUploadComplete?: (fileUrl: string) => Promise<void> | void; // Callback function after upload
}

/**
 * Uploads a file to S3 with optional resizing, format conversion, and a callback for further processing.
 * @param {UploadOptions} options - Configuration options
 * @returns {Promise<string>} - The uploaded file URL
 */
export async function UploadImageToS3({
      file,
      folder = "uploads",
      resize = { width: 1200, height: 1200, fit: "cover", position: "center" },
      format = "webp",
      quality = 80,
      contentType = "image/webp",
      saveToDb = false,
      deleteLocal = true,
      onUploadComplete,
}: UploadOptions): Promise<string> {
      if (!file) {
            throw new Error("No file uploaded");
      }

      const fileKey = `${folder}/${folder}-${file.filename}.${format}`;
      const tempFilePath = path.join("public/uploads", `temp-${folder}-${file.filename}.${format}`);

      // Resize and compress image
      await sharp(file.path)
            .resize(resize as ResizeOptions)
            .toFormat(format)
      [format]?.({ quality })
            .toFile(tempFilePath);

      // Read file buffer
      const fileStream = fs.readFileSync(tempFilePath);

      // Upload to S3
      const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: fileKey,
            Body: fileStream,
            ContentType: contentType,
      });

      await s3.send(command);

      // Construct file URL
      const fileUrl = `${process.env.CLOUDFRONT_URL}/${fileKey}`;

      // Delete local files if enabled
      if (deleteLocal) {
            try {
                  fs.unlinkSync(tempFilePath); // Delete resized file
                  fs.unlinkSync(file.path); // Delete original uploaded file
            } catch (err) {
                  console.error("Error deleting local files:", err);
            }
      }

      // If saveToDb is enabled, trigger the callback
      if (saveToDb && onUploadComplete) {
            await onUploadComplete(fileUrl);
      }

      return fileUrl;
}
