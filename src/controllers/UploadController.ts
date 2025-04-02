import { Request, Response } from 'express';
import * as fs from 'fs';
import UploadImageCloudflare from '@libs/UploadImageCloudflare';
import tusUploader from '@libs/tus';
import socketserver from '@libs/io';
import { UploadFileType } from '../types/cloudflare';

interface UploadedFile {
      path: string;
      mimetype: string;
      originalname: string;
}

class UploadController {
      static async UploadMedia(req: Request, res: Response): Promise<void> {
            const io = socketserver.getIO();
            try {
                  const file = req.file as Express.Multer.File & UploadedFile;
                  const fileId = req.body.fileId;
                  const filePath = file.path;
                  let upload: UploadFileType | null = null;

                  if (file.mimetype.includes('image/')) {
                        const fileBuffer = fs.readFileSync(filePath);
                        const image = {
                              buffer: fileBuffer,
                              originalname: file.originalname,
                        };

                        // requires buffer
                        const uploadedImage = await UploadImageCloudflare(image);

                        if ('error' in uploadedImage) {
                              throw new Error(uploadedImage.message);
                        }

                        upload = {
                              ...uploadedImage,
                              type: 'image'
                        } as UploadFileType;

                        io.emit("upload-complete", {
                              id: fileId,
                              percentage: 100,
                        });
                  }

                  if (file.mimetype.includes('video/')) {
                        const video = await tusUploader({ filePath, file, fileId });
                        if ('error' in video) {
                              throw new Error(video.message);
                        }
                        upload = {
                              public: `${process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN}${video.mediaId}/manifest/video.m3u8`,
                              blur: ``,
                              id: video?.mediaId,
                              type: 'video'
                        };
                  }
                  if (!upload) {
                        res.status(401).json({ error: "Invalid file type" });
                  }

                  res.json(upload);

            } catch (error: any) {
                  console.log(error);
                  res.status(500).json({
                        error: true,
                        message: error.message
                  });
            }
      }
}

export default UploadController;
