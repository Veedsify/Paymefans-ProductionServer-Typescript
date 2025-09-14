import * as fs from "fs/promises";
import sharp from "sharp";
import type { ResizeOptions } from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { s3 } from "@utils/aws";
import { config } from "config/config";
export interface UploadOptions {
  file: Express.Multer.File;
  folder?: string;
  resize?: {
    width: number;
    height: number | null;
    fit?: sharp.FitEnum | string;
    position?: number | string | undefined;
  };
  format?: "webp" | "jpeg" | "png" | "avif";
  quality?: number;
  contentType?: string;
  saveToDb?: boolean;
  deleteLocal?: boolean;
  onUploadComplete?: (fileUrl: string) => Promise<void> | void;
  onObjectOnly?: (fileKey: string) => Promise<void> | void;
  bucket?: string;
}
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
  onObjectOnly,
  bucket = config.mainPaymefansBucket,
}: UploadOptions): Promise<string> {
  if (!file) {
    throw new Error("No file uploaded");
  }
  const filename = file.filename.replace(/\.[^/.]+$/, ""); // Remove any existing extension
  const fileKey = `${folder}/${folder}-${filename}.${format}`;
  const tempFilePath = path.join(
    "public/uploads",
    `temp-${folder}-${filename}.${format}`,
  );
  // Resize and compress image
  await sharp(file.path)
    .resize(resize as ResizeOptions)
    .toFormat(format)
    [format]?.({ quality })
    .toFile(tempFilePath);
  // Read file buffer
  const fileStream = await fs.readFile(tempFilePath);
  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: bucket!,
    Key: fileKey,
    Body: fileStream,
    ContentType: contentType,
  });
  await s3.send(command);
  // Construct file URL
  const fileUrl = `${process.env.AWS_CLOUDFRONT_URL}/${fileKey}`;
  // Delete local files if enabled
  async function deleteFiles(tempFilePath: string, filePath: string) {
    try {
      await fs.rm(tempFilePath); // Delete resized file
      await fs.rm(filePath);
    } catch (err) {
      console.error("Error deleting local files:", err);
    }
  }
  if (deleteLocal) {
    try {
      await deleteFiles(tempFilePath, file.path);
    } catch (err) {
      console.error("Error deleting local files:", err);
    }
  }
  // If saveToDb is enabled, trigger the callback
  if (saveToDb && onUploadComplete) {
    await onUploadComplete(fileUrl);
  }
  if (onObjectOnly && saveToDb) {
    await onObjectOnly(fileKey);
  }
  return fileUrl;
}
