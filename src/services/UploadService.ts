import axios from "axios";
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
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_ACCOUNT_TOKEN}`,
              'Content-Type': 'application/json',
              'Tus-Resumable': '1.0.0',
              'Upload-Length': `${fileSize}`,
              'Upload-Metadata': `maxDurationSeconds ${maxDuration}, name ${fileName}, filetype ${fileType}`,
            },
          }
        );

        const uploadUrl = response.headers.get('location');
        const mediaId = response.headers.get('stream-media-id');

        return {
          error: false,
          id: mediaId as string,
          uploadUrl: uploadUrl as string,
          type: "video",
          message: "Upload URL generated successfully",
        };
      }
    } catch (error: any) {
      console.log(error.response.data.message || error.message);
      throw new Error(error.message);
    }

    try {
      if ("explicitImageType" in data && data.type == "image") {
        const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`;
        console.log(url);
        const imageResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_ACCOUNT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await imageResponse.json();

        return {
          error: false,
          id: data.result.id,
          uploadUrl: data.result.uploadURL,
          type: "image",
          message: "Upload URL generated successfully",
        };
      }
    } catch (error: any) {
      console.log(error.status)
      console.log(error.response.data.message || error.message);
      throw new Error(error.message);
    }

    return {
      error: true,
      id: "",
      uploadUrl: "",
      type: "",
      message: `No Upload Url Available`,
    };
  }
}
