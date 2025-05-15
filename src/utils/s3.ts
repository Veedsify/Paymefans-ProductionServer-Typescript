import { S3Client } from '@aws-sdk/client-s3'
import dotenv from "dotenv"
dotenv.config()
const { AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY } = process.env

const s3 = new S3Client({
      region: AWS_REGION as string,
      credentials: {
            accessKeyId: AWS_ACCESS_KEY as string,
            secretAccessKey: AWS_SECRET_KEY as string
      }
})


export default s3
