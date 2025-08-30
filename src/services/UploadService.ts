import { UploadMedieDataProps, UploadResponseResponse } from "types/upload";
import Cloudflare from "cloudflare";
import { AuthUser } from "types/user";
import UserService from "./UserService";
import WatermarkService from "./WatermarkService";
const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCOUNT_TOKEN } = process.env;
const client = new Cloudflare({
  apiToken: CLOUDFLARE_ACCOUNT_TOKEN,
});

export default class UploadService {
  static async CreateMediaUploadSignedUrl({
    data,
    user
  }: {
    data: UploadMedieDataProps;
    user: AuthUser;
  }): Promise<UploadResponseResponse> {
    const authUser = await UserService.RetrieveUser(user.id);
    if (!authUser.status && !("user" in authUser)) {
      throw new Error("User not found or unauthorized");
    }

    const isWatermarkEnabled = await WatermarkService.isUserWatermarkEnabled(
      authUser.user?.id!
    );

    let watermarkUid = null;
    if (isWatermarkEnabled) {
      watermarkUid = await WatermarkService.getUserWatermarkUid(authUser.user?.id!);
      if (!watermarkUid) {
        watermarkUid = await WatermarkService.createWatermarkForUser(authUser.user?.id!);
      }
    } else {
      watermarkUid = await WatermarkService.createWatermarkForUser(authUser.user?.id!);
    }
    try {
      if ("fileSize" in data && data.type === "video") {
        const { fileSize, maxDuration, fileType, fileName } = data;

        const uplaodMetadata = {
          maxDurationSeconds: maxDuration,
          name: fileName,
          filetype: fileType,
          allowedorigins: btoa("*.paymefans.com,paymefans.com,localhost:3000"),
          watermark: isWatermarkEnabled && btoa(watermarkUid!),
          ...(data.shouldUseSignedUrls && ({ requiresignedurls: btoa(true.toString()) }))
        };

        const uploadMetadataString = Object.entries(uplaodMetadata)
          .map(([key, value]) => `${key} ${value}`)
          .join(",");

        console.log("Upload Metadata String:", uploadMetadataString);

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${CLOUDFLARE_ACCOUNT_TOKEN}`,
              "Content-Type": "application/json",
              "Tus-Resumable": "1.0.0",
              "Upload-Length": `${fileSize}`,
              "Upload-Metadata": uploadMetadataString
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData?.errors?.[0]?.message ||
            `Failed to get upload URL: ${response.statusText} `
          );
        }

        const uploadUrl = response.headers.get("location");
        const mediaId = response.headers.get("stream-media-id");

        if (!uploadUrl || !mediaId) {
          throw new Error("Missing upload URL or media ID in response headers");
        }

        return {
          error: false,
          id: mediaId as string,
          uploadUrl: uploadUrl as string,
          type: "video",
          message: "Upload URL generated successfully",
        };
      }

      if ("explicitImageType" in data && data.type == "image") {
        const directUpload = await client.images.v2.directUploads.create({
          account_id: CLOUDFLARE_ACCOUNT_ID!,
          // requireSignedURLs: true,
        });


        return {
          error: false,
          id: directUpload.id as string,
          uploadUrl: directUpload.uploadURL as string,
          type: "image",
          message: "Upload URL generated successfully",
        };
      }

      throw new Error("Invalid data for upload");
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || error.message);
    }
  }
}
