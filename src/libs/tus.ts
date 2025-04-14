import fs from 'fs';
import tus from 'tus-js-client';
import dotenv from "dotenv";
dotenv.config();
import type { TusUploader, TusUploaderResponse } from "../types/cloudflare";

import IoInstance from "./io";
const { CLOUDFLARE_ACCOUNT_TOKEN, CLOUDFLARE_ACCOUNT_ID } = process.env;

const tusUploader = async ({ filePath, file, fileId }: TusUploader): Promise<TusUploaderResponse> => {
    const io = IoInstance.getIO()
    try {
        var stream = fs.createReadStream(filePath);
        var size = fs.statSync(filePath).size;
        var mediaId = "";
        var options = {
            endpoint: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
            headers: {
                Authorization: `Bearer ${CLOUDFLARE_ACCOUNT_TOKEN}`,
            },
            chunkSize: 50 * 1024 * 1024, // Required a minimum chunk size of 5 MB. Here we use 50 MB.
            retryDelays: [0, 3000, 5000, 10000, 20000], // Indicates to tus-js-client the delays after which it will retry if the upload fails.
            metadata: {
                name: file.filename,
                filetype: "video/mp4",
                // Optional if you want to include a watermark
                // watermark: '<WATERMARK_UID>',
            },
            uploadSize: size,
            onError: function (error: any) {
                throw error;
            },
            onProgress: function (bytesUploaded: number, bytesTotal: number) {
                var percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
                io.emit("upload-progress", {
                    id: fileId,
                    percentage: percentage,
                });
                // console.log(bytesUploaded, bytesTotal, percentage + "%");
            },
            onSuccess: function () {
                console.log("Upload finished");
            },
            onAfterResponse: function (_: any, res: any) {
                return new Promise((resolve) => {
                    var mediaIdHeader = res.getHeader("stream-media-id");
                    if (mediaIdHeader) {
                        console.log("Media ID", mediaIdHeader);
                        mediaId = mediaIdHeader;
                    }
                    resolve(void 0);
                });
            },
        };

        return new Promise((resolve, reject) => {
            var upload = new tus.Upload(stream, {
                ...options,
                onSuccess: function () {
                    console.log("Upload finished");
                    io.emit("upload-complete", {
                        id: fileId,
                        percentage: 100,
                    });
                    resolve({
                        mediaId,
                    });
                },
                onError: function (error: any) {
                    reject(error);
                }
            } as tus.UploadOptions);
            upload.start();
        });
    } catch (err) {
        console.log(err);
        return {
            error: true,
            message: err as string
        }
    }
}

export default tusUploader;
