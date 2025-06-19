import {
  RekognitionClient,
  CompareFacesCommand,
} from "@aws-sdk/client-rekognition";

const { AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_SIMILARITY_TRESHOLD } =
  process.env;

import { AwsFaceVerificationProps } from "../types/verification";

const rekognition = new RekognitionClient({
  region: AWS_REGION as string,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY as string,
    secretAccessKey: AWS_SECRET_KEY as string,
  },
});

const AwsFaceVerification = async ({
  front,
  faceVideo,
}: AwsFaceVerificationProps) => {
  try {
    const compareAndVerifyFace = {
      SourceImage: {
        S3Object: {
          Bucket: front.bucket,
          Name: front.key,
        }, // Buffer for the first image
      },
      TargetImage: {
        S3Object: {
          Bucket: faceVideo.bucket,
          Name: faceVideo.key,
        }, // Buffer for the second image
      },
    };
    const command = new CompareFacesCommand(compareAndVerifyFace);
    const data = await rekognition.send(command);

    if (
      data &&
      Array.isArray(data.FaceMatches) &&
      data.FaceMatches.length > 0 &&
      typeof data.FaceMatches[0]?.Similarity === "number" &&
      data.FaceMatches[0].Similarity >= Number(AWS_SIMILARITY_TRESHOLD) &&
      typeof data.SourceImageFace?.Confidence === "number" &&
      data.SourceImageFace.Confidence >= Number(AWS_SIMILARITY_TRESHOLD)
    ) {
      return {
        error: false,
        message: "Face Matches With ID",
      };
    } else if (
      Array.isArray(data?.FaceMatches) &&
      data.FaceMatches.length > 0 &&
      typeof data.FaceMatches[0]?.Similarity === "number" &&
      (data.FaceMatches[0].Similarity > 20 ||
        data.FaceMatches[0].Similarity < 40)
    ) {
      return {
        error: true,
        message: "Please Take a Clearer Photo Of Your Id",
      };
    } else {
      return {
        error: true,
        message: "Please use a valid identification card",
      };
    }
  } catch (error: any) {
    return {
      error: true,
      message: error.message,
    };
  }
};
export {  AwsFaceVerification };
