import { FileUpload } from "../types/cloudflare";

async function UploadImageCloudflare(image: { buffer: Buffer, originalname: string }): Promise<FileUpload> {
    try {
        const UPLOAD_IMAGE = process.env.CLOUDFLARE_IMAGE_UPLOAD;
        const ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;
        const formData = new FormData();
        const blob = new Blob([image.buffer]);
        formData.append("file", blob, image.originalname);
        const response = await fetch(UPLOAD_IMAGE as string, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.CLOUDFLARE_ACCOUNT_TOKEN}`
            },
            body: formData  // Streaming formData
        });
        const uploadedImage = await response.json();
        if(!uploadedImage.success) {
            return {
                error: true,
                message: uploadedImage.errors[0].message
            };
        }

        return {
            public: `https://imagedelivery.net/${ACCOUNT_HASH}/${uploadedImage.result.id}/public`,
            blur: `https://imagedelivery.net/${ACCOUNT_HASH}/${uploadedImage.result.id}/blured`,
            id: uploadedImage.result.id
        };
    } catch (err: any) {
        console.error(err);
        return {
            error: true,
            message: err.message
        };
    }
}

export default UploadImageCloudflare;
