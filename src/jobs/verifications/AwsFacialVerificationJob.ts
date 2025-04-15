import { redis } from "@libs/RedisStore";
import { AwsFaceVerification } from "@services/AwsRekognitionFacialVerification";
import query from "@utils/prisma";
import { Queue, Worker } from "bullmq";
import type { AwsRekognitionObject } from "types/verification";

const AwsVerificationQueue = new Queue("aws-verification", {
  connection: redis,
});

const ProcessFaceComparison = async (
  front: AwsRekognitionObject,
  faceVideo: AwsRekognitionObject
): Promise<boolean> => {
  // Aws Face Verification With Rekognition
  const AwsComparison = await AwsFaceVerification({
    front: front,
    faceVideo: faceVideo,
  });

  if (AwsComparison.error) {
    return false;
  }
  // Aws Data Verification ID Details & Country Match With User
  // Coming in Later
  return true;
};

const UpdateVerificationStatus = async (
  token: string,
  match: boolean,
  front: AwsRekognitionObject,
  faceVideo: AwsRekognitionObject
) => {
  // Check For Verification
  const model = await query.model.findFirst({
    where: {
      token: token,
    },
    select: {
      id: true,
    },
  });

  if (!model) {
    return { error: true, message: "Model not found" };
  }
  const user = await query.model.update({
    where: {
      id: model.id,
    },
    data: {
      verification_state: match ? "approved" : "rejected",
      verification_status: match,
      verification_video: match
        ? `${process.env.AWS_CLOUDFRONT_URL}/${faceVideo.key}`
        : "",
      verification_image: match
        ? `${process.env.AWS_CLOUDFRONT_URL}/${front.key}`
        : "",
    },
    select: {
      user_id: true,
    },
  });

  if (!user) {
    return { error: true, message: "User not found" };
  }

  await query.user.update({
    where: {
      id: user.user_id,
    },
    data: {
      is_model: true,
    },
  });

  return { error: false, message: "Verification successful" };
};

const AwsVerificationWorker = new Worker(
  "aws-verification",
  async (job) => {
    try {
      const { front, faceVideo, token, back } = job.data;
      const match = await ProcessFaceComparison(front, faceVideo);
      //  perform strict id chech here
      const result = await UpdateVerificationStatus(
        token,
        match,
        front,
        faceVideo
      );

      if (result.error) {
        // Send Verification Failed Notification
        // Send Verification Failed Email
        console.log(result, back);
        return {
          error: true,
          message: result.message,
        };
      }

      // Send Verification Successful Notification
      // Send Verification Successful Email

      console.log(result);
      return {
        error: false,
        message: "Verification successful",
      };
    } catch (error: any) {
      console.log(error);
      throw new Error(error.message);
    }
  },
  { connection: redis }
);

AwsVerificationWorker.on("failed", (job) =>
  console.log(
    `${job?.name} - with ID ${job?.id} Failed cause ${job?.failedReason}`
  )
);
AwsVerificationWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
  // Handle the completion of the job
});

export { AwsVerificationQueue };
