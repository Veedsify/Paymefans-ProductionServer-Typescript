import type { FileUpload } from "../types/cloudflare";
import axios from "axios";

async function UploadImageCloudflare(image: {
  buffer: Buffer;
  originalname: string;
}): Promise<FileUpload> {
  try {
    const UPLOAD_IMAGE = process.env.CLOUDFLARE_IMAGE_UPLOAD;
    const ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;
    const formData = new FormData();
    formData.append("file", new Blob([image.buffer]), image.originalname);

    const uploadedImage = await axios
      .post(UPLOAD_IMAGE as string, formData, {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_ACCOUNT_TOKEN}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => response.data);
    if (!uploadedImage.success) {
      return {
        error: true,
        message: uploadedImage.errors[0].message,
      };
    }

    return {
      public: `https://imagedelivery.net/${ACCOUNT_HASH}/${uploadedImage.result.id}/public`,
      blur: `https://imagedelivery.net/${ACCOUNT_HASH}/${uploadedImage.result.id}/blured`,
      id: uploadedImage.result.id,
    };
  } catch (err: any) {
    console.error(err);
    return {
      error: true,
      message: err.message,
    };
  }
}

export default UploadImageCloudflare;
