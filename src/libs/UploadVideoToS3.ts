import s3 from "@utils/s3";
import fs from "fs";
import { Upload } from "@aws-sdk/lib-storage";
import IoInstance from "@libs/io";

const UploadVideoToS3 = async (
  file: Express.Multer.File,
  s3Key: string,
  socketChannel: string
) => {
  const io = IoInstance.getIO();
  return new Promise(async (resolve, reject) => {
    try {
      const fileStream = fs.createReadStream(file.path);

      fileStream.on("error", (err: Error) => {
        reject(new Error(`Error reading file: ${err.message}`));
      });

      const uploadParams = {
        client: s3,
        params: {
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: s3Key,
          Body: fileStream,
          ContentLength: file.size,
          ContentType: file.mimetype,
        },
        queueSize: 10, // Number of parts to upload in parallel
      };

      const parallelUpload = new Upload(uploadParams);

      parallelUpload.on("httpUploadProgress", (progress) => {
        // Emit progress to the socket channel
        io.to(socketChannel).emit("uploadProgress", {
          progress: progress.loaded,
          total: progress.total,
        });
        console.log(
          `Uploaded ${progress.loaded} bytes out of ${progress.total}`
        );
      });

      fileStream.on("error", (err: Error) => {
        fileStream.destroy(); // Close stream on error
        reject(new Error(`Error reading file: ${err.message}`));
      });
      await parallelUpload.done();
      fs.unlinkSync(file.path);
      resolve(s3Key);
    } catch (error: any) {
      fs.unlinkSync(file.path);
      reject(new Error(`Error uploading file: ${error.message}`));
    }
  });
};

export default UploadVideoToS3;
