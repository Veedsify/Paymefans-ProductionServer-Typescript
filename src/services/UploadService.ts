import { UploadMedieDataProps, UploadResponseResponse } from "types/upload";
import { AuthUser } from "types/user";
const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCOUNT_TOKEN } = process.env;

export default class UploadService {
  static async CreateMediaUploadSignedUrl({
    data,
  }: {
    data: UploadMedieDataProps;
    user: AuthUser;
  }): Promise<UploadResponseResponse> {
    try {
      if ("fileSize" in data && data.type === "video") {
        const { fileSize, maxDuration, fileType, fileName } = data;

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${CLOUDFLARE_ACCOUNT_TOKEN}`,
              "Content-Type": "application/json",
              "Tus-Resumable": "1.0.0",
              "Upload-Length": `${fileSize}`,
              "Upload-Metadata": `maxDurationSeconds ${maxDuration},name ${fileName},filetype ${fileType}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData?.errors?.[0]?.message ||
              `Failed to get upload URL: ${response.statusText}`
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
        const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`;
        const imageResponse = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_ACCOUNT_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        const dataRes = await imageResponse.json();

        return {
          error: false,
          id: dataRes.result.id,
          uploadUrl: dataRes.result.uploadURL,
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
