import UserService from "./UserService";
import query from "@utils/prisma";
import { AuthUser } from "types/user";
import sharp from "sharp";
import tmp from "tmp-promise";
import axios from "axios";

interface WatermarkStyle {
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor?: string;
  opacity?: number;
}

// Types and interfaces
interface WatermarkConfig {
  opacity: string;
  padding: string;
  scale: string;
  position: "upperLeft" | "upperRight" | "lowerLeft" | "lowerRight" | "center";
}

interface CloudflareResponse {
  success: boolean;
  result: { uid: string };
  errors?: Array<{ message: string }>;
}

interface WatermarkFile {
  filePath: string;
  fileName: string;
  cleanup?: () => Promise<void>;
}

// Configuration with validation (unchanged)
class CloudflareWatermarkConfig {
  private static instance: CloudflareWatermarkConfig;

  public readonly accountId: string;
  public readonly accountToken: string;
  public readonly customerSubdomain: string;
  public readonly imageKey: string;
  public readonly appUrl: string;

  private constructor() {
    this.accountId = this.getRequiredEnvVar("CLOUDFLARE_ACCOUNT_ID");
    this.accountToken = this.getRequiredEnvVar("CLOUDFLARE_ACCOUNT_TOKEN");
    this.customerSubdomain = this.getRequiredEnvVar(
      "CLOUDFLARE_CUSTOMER_DOMAIN",
    );
    this.imageKey = this.getRequiredEnvVar("CLOUDFLARE_IMAGE_KEY");
    this.appUrl = this.processAppUrl(this.getRequiredEnvVar("APP_URL"));
  }

  public static getInstance(): CloudflareWatermarkConfig {
    if (!CloudflareWatermarkConfig.instance) {
      CloudflareWatermarkConfig.instance = new CloudflareWatermarkConfig();
    }
    return CloudflareWatermarkConfig.instance;
  }

  private getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  private processAppUrl(url: string): string {
    return url.replace(/^https?:\/\//, "");
  }
}

export default class WatermarkService {
  private static readonly defaultWatermarkConfig: WatermarkConfig = {
    opacity: "1.0",
    padding: "0.02",
    scale: "0.8",
    position: "lowerLeft",
  };

  private static readonly defaultWatermarkStyle: WatermarkStyle = {
    width: 672,
    height: 67,
    fontSize: 32,
    fontFamily: "Helvetica, Arial, system-ui, sans-serif",
    textColor: "#ffffff",
    backgroundColor: "transparent",
    opacity: 1,
  };

  /**
   * Upload watermark image to Cloudflare Stream
   */
  static async uploadWatermarkImage(
    filePath: string,
    fileName: string,
    config: Partial<WatermarkConfig> = {},
  ): Promise<string> {
    const cloudflareConfig = CloudflareWatermarkConfig.getInstance();
    const watermarkConfig = { ...this.defaultWatermarkConfig, ...config };

    try {
      const formData = new FormData();
      const imageBuffer = await sharp(filePath).toBuffer();

      // Determine MIME type based on file extension
      const mimeType = fileName.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/svg+xml";
      const imageBlob = new Blob([new Uint8Array(imageBuffer)], {
        type: mimeType,
      });

      formData.append("file", imageBlob, fileName);
      formData.append("name", fileName);
      formData.append("opacity", watermarkConfig.opacity);
      formData.append("padding", watermarkConfig.padding);
      formData.append("scale", watermarkConfig.scale);
      formData.append("position", watermarkConfig.position);

      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareConfig.accountId}/stream/watermarks`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${cloudflareConfig.accountToken}`,
            "Content-Type": `multipart/form-data`,
          },
        },
      );

      const data: CloudflareResponse = response.data;

      if (!data.success) {
        const errorMessage = data.errors?.[0]?.message || "Unknown error";
        throw new Error(`Cloudflare API error: ${errorMessage}`);
      }

      return data.result.uid;
    } catch (error) {
      throw new Error(
        `Failed to upload watermark image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create watermark PNG image file using tmp (converted from SVG)
   */
  static async createWatermarkImage(
    user: Partial<AuthUser>,
  ): Promise<WatermarkFile> {
    return this.createWatermarkImageAsPNG(user);
  }

  /**
   * Create watermark as PNG file (default method)
   */
  static async createWatermarkImageAsPNG(
    user: Partial<AuthUser>,
  ): Promise<WatermarkFile> {
    if (!user?.username) {
      throw new Error("User username is required to create watermark");
    }

    const cloudflareConfig = CloudflareWatermarkConfig.getInstance();
    const username = user.username.replace(/^@/, "");
    const sanitizedUsername = username.replace(/@/g, "_");
    const svgString = this.generateWatermarkSVG(
      cloudflareConfig.appUrl,
      username,
    );

    try {
      // Create temp PNG file (auto-deletes on process exit)
      const { path: pngFilePath, cleanup } = await tmp.file({
        postfix: `.png`,
        discardDescriptor: true,
      });

      // Convert SVG to PNG using Sharp
      await sharp(Buffer.from(svgString))
        .png({
          quality: 100,
          adaptiveFiltering: false,
        })
        .resize(
          this.defaultWatermarkStyle.width,
          this.defaultWatermarkStyle.height,
          {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
          },
        )
        .toFile(pngFilePath);

      return {
        filePath: pngFilePath,
        fileName: `watermark-${sanitizedUsername}-${Date.now()}.png`,
        cleanup,
      };
    } catch (error) {
      throw new Error(
        `Failed to create watermark PNG file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create watermark as SVG file (alternative method)
   */
  static async createWatermarkImageAsSVG(
    user: Partial<AuthUser>,
  ): Promise<WatermarkFile> {
    if (!user?.username) {
      throw new Error("User username is required to create watermark");
    }
    const cloudflareConfig = CloudflareWatermarkConfig.getInstance();
    const username = user.username.replace(/^@/, "");
    const sanitizedUsername = username.replace(/@/g, "_");
    const svgString = this.generateWatermarkSVG(
      cloudflareConfig.appUrl,
      username,
    );

    try {
      // Create temp SVG file (auto-deletes on process exit)
      const { path: svgFilePath, cleanup } = await tmp.file({
        postfix: `.svg`,
        discardDescriptor: true,
      });

      // Write SVG content to file
      await new Promise<void>((resolve, reject) => {
        require("fs").writeFile(
          svgFilePath,
          svgString,
          "utf8",
          (err: Error | null) => {
            err ? reject(err) : resolve();
          },
        );
      });

      return {
        filePath: svgFilePath,
        fileName: `watermark-${sanitizedUsername}-${Date.now()}.svg`,
        cleanup,
      };
    } catch (error) {
      throw new Error(
        `Failed to create watermark SVG file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create watermark as PNG file with custom styling
   */
  static async createCustomWatermarkImageAsPNG(
    user: Partial<AuthUser>,
    customStyle: Partial<WatermarkStyle> = {},
  ): Promise<WatermarkFile> {
    if (!user?.username) {
      throw new Error("User username is required to create watermark");
    }

    const cloudflareConfig = CloudflareWatermarkConfig.getInstance();
    const username = user.username.replace(/^@/, "");
    const sanitizedUsername = username.replace(/@/g, "_");
    const style = { ...this.defaultWatermarkStyle, ...customStyle };
    const svgString = this.generateCustomWatermarkSVG(
      cloudflareConfig.appUrl,
      username,
      style,
    );

    try {
      // Create temp PNG file (auto-deletes on process exit)
      const { path: pngFilePath, cleanup } = await tmp.file({
        postfix: `.png`,
        discardDescriptor: true,
      });

      // Convert SVG to PNG using Sharp with custom dimensions
      await sharp(Buffer.from(svgString))
        .png({
          quality: 100,
          compressionLevel: 0,
          adaptiveFiltering: false,
        })
        .resize(style.width, style.height, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
        })
        .toFile(pngFilePath);

      return {
        filePath: pngFilePath,
        fileName: `watermark-${sanitizedUsername}-${Date.now()}.png`,
        cleanup,
      };
    } catch (error) {
      throw new Error(
        `Failed to create custom watermark PNG file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate custom SVG string for watermark with styling options
   */
  private static generateCustomWatermarkSVG(
    appUrl: string,
    username: string,
    style: WatermarkStyle,
  ): string {
    const escapedUsername = username.replace(/@/g, "");

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${style.width}" height="${style.height}" viewBox="0 0 ${style.width} ${style.height}">
  <rect width="${style.width}" height="${style.height}" fill="${style.backgroundColor || "none"}"/>
  <defs>
    <filter id="blur" x="-100%" y="-100%" width="100%" height="100%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
  </defs>
  <text
    x="20" y="${style.height - 10}" font-size="${style.fontSize}" font-weight="medium"
    font-family="${style.fontFamily}" fill="#000000" filter="url(#blur)" text-anchor="start"
    opacity="${style.opacity ?? 1}">
      ${appUrl}/${escapedUsername}
  </text>
  <text
    x="20" y="${style.height - 10}" font-size="${style.fontSize}" font-weight="medium"
    font-family="${style.fontFamily}" fill="${style.textColor}" text-anchor="start"
    opacity="${style.opacity ?? 1}">
      ${appUrl}/${escapedUsername}
  </text>
</svg>`;

    return svg;
  }

  /**
   * Generate SVG string for watermark (optimized for PNG conversion)
   */
  private static generateWatermarkSVG(
    appUrl: string,
    username: string,
  ): string {
    return this.generateCustomWatermarkSVG(
      appUrl,
      username,
      this.defaultWatermarkStyle,
    );
  }

  /**
   * Create and upload watermark for a user (with tmp cleanup)
   */
  static async createWatermarkForUser(userId: number): Promise<string> {
    let tempFile: WatermarkFile | null = null;

    try {
      const userResult = await UserService.RetrieveUser(userId);
      if (!userResult?.user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const existingUid = await this.getUserWatermarkUid(userId);
      if (existingUid) {
        await this.deleteWatermark(existingUid);
        console.log(`Deleted existing watermark for user ${userId}`);
      }

      tempFile = await this.createWatermarkImage(userResult.user);
      const uid = await this.uploadWatermarkImage(
        tempFile.filePath,
        tempFile.fileName,
      );

      await query.settings.update({
        where: { id: userId },
        data: { watermark_uid: uid },
      });

      return uid;
    } catch (error) {
      throw new Error(
        `Failed to create watermark for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      if (tempFile?.cleanup) {
        await tempFile
          .cleanup()
          .catch((e) => console.warn(`Temp cleanup failed:`, e));
      }
    }
  }

  /* -- Remaining methods (unchanged) -- */

  static async getUserWatermarkUid(userId: number): Promise<string | null> {
    try {
      const user = await query.settings.findUnique({
        where: { id: userId },
        select: { watermark_uid: true },
      });
      return user?.watermark_uid || null;
    } catch (error) {
      console.error(
        `Failed to retrieve watermark UID for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  static async enableUserWatermark(userId: number): Promise<boolean> {
    try {
      const watermarkUid = await this.getUserWatermarkUid(userId);
      if (!watermarkUid)
        throw new Error(`No watermark UID found for user ${userId}`);

      const user = await query.user.update({
        where: { id: userId },
        data: { watermarkEnabled: true },
      });
      return !!user;
    } catch (error) {
      console.error(`Failed to enable watermark for user ${userId}:`, error);
      return false;
    }
  }

  static async disableUserWatermark(userId: number): Promise<boolean> {
    try {
      const user = await query.user.update({
        where: { id: userId },
        data: { watermarkEnabled: false },
      });
      return !!user;
    } catch (error) {
      console.error(`Failed to disable watermark for user ${userId}:`, error);
      return false;
    }
  }

  static async isUserWatermarkEnabled(userId: number): Promise<boolean> {
    try {
      const user = await query.user.findUnique({
        where: { id: userId },
        select: { watermarkEnabled: true },
      });
      return user?.watermarkEnabled || false;
    } catch (error) {
      console.error(
        `Failed to check watermark status for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  static async deleteWatermark(watermarkUid: string): Promise<void> {
    const cloudflareConfig = CloudflareWatermarkConfig.getInstance();
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareConfig.accountId}/stream/watermarks/${watermarkUid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${cloudflareConfig.accountToken}`,
          },
        },
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data: CloudflareResponse = await response.json();
      if (!data.success) {
        const errorMessage = data.errors?.[0]?.message || "Unknown error";
        throw new Error(`Cloudflare API error: ${errorMessage}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to delete watermark: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
