import { S3Client } from "@aws-sdk/client-s3";
import { MediaConvertClient } from "@aws-sdk/client-mediaconvert";
import dotenv from "dotenv";
dotenv.config();
const {
  AWS_REGION,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_MEDIACONVERT_ENDPOINT,
} = process.env;

const s3 = new S3Client({
  region: AWS_REGION as string,
  forcePathStyle: false,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY as string,
    secretAccessKey: AWS_SECRET_KEY as string,
  },
});

const mediaConvert = new MediaConvertClient({
  region: AWS_REGION, // Replace with your region
  endpoint: AWS_MEDIACONVERT_ENDPOINT, // Your MediaConvert endpoint
  credentials: {
    accessKeyId: AWS_ACCESS_KEY as string,
    secretAccessKey: AWS_SECRET_KEY as string,
  },
});

export { s3, mediaConvert };
