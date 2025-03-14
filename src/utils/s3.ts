import { S3Client } from '@aws-sdk/client-s3'
import dotenv from "dotenv"
dotenv.config()
const { S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY } = process.env

const s3 = new S3Client({
      region: S3_REGION as string,
      credentials: {
            accessKeyId: S3_ACCESS_KEY as string,
            secretAccessKey: S3_SECRET_KEY as string
      }
})

export default s3
