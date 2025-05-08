import { redis } from "@libs/RedisStore";
import { AwsFaceVerification } from "@services/AwsRekognitionFacialVerification";
import EmailService from "@services/EmailService";
import GetSinglename from "@utils/GetSingleName";
import query from "@utils/prisma";
import { Queue, Worker } from "bullmq";
// import logger from "@libs/Logger";`
// import config from "@config"; // Hypothetical config module

// Logger setup

// Interfaces for type safety
interface AwsRekognitionObject {
  key: string;
  bucket: string;
}

interface VerificationJobData {
  token: string;
  front: AwsRekognitionObject;
  faceVideo: AwsRekognitionObject;
}

interface VerificationResult {
  error: boolean;
  message: string;
}

// Custom error class
class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationError";
  }
}

// Initialize queue
const AwsVerificationQueue = new Queue("aws-verification", {
  connection: redis,
});

// Process face comparison
const processFaceComparison = async (
  front: AwsRekognitionObject,
  faceVideo: AwsRekognitionObject
): Promise<boolean> => {
  const awsComparison = await AwsFaceVerification({ front, faceVideo });
  if (awsComparison.error) {
    // logger.error("Face comparison failed", { error: awsComparison.error });
    return false;
  }
  return true;
};

// Update verification status in database
const updateModelVerification = async (
  token: string,
  match: boolean,
  front: AwsRekognitionObject,
  faceVideo: AwsRekognitionObject
) => {
  const model = await query.model.findFirst({
    where: { token },
    select: { id: true },
  });

  if (!model) {
    throw new VerificationError("Model not found");
  }

  const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL; // Safely access env var
  return query.model.update({
    where: { id: model.id },
    data: {
      verification_state: match ? "approved" : "rejected",
      verification_status: match,
      verification_video: match ? `${cloudfrontUrl}/${faceVideo.key}` : "",
      verification_image: match ? `${cloudfrontUrl}/${front.key}` : "",
    },
    select: {
      user_id: true,
      user: {
        select: {
          username: true,
          email: true,
          name: true,
        },
      },
    },
  });
};

// Send verification notification
const sendVerificationNotification = async (
  name: string,
  email: string
): Promise<void> => {
  await EmailService.VerificationComplete(name, email);
  // logger.info("Verification email sent", { email });
};

// Update user status
const updateUserStatus = async (userId: number): Promise<void> => {
  await query.user.update({
    where: { id: userId },
    data: { is_model: true },
  });
};

// Main verification status update logic
const updateVerificationStatus = async (
  token: string,
  match: boolean,
  front: AwsRekognitionObject,
  faceVideo: AwsRekognitionObject
): Promise<VerificationResult> => {
  try {
    if (!match) {
      return { error: true, message: "Verification failed" };
    }

    const user = await updateModelVerification(token, match, front, faceVideo);
    if (!user?.user) {
      throw new VerificationError("User not found");
    }

    const name = GetSinglename(user.user.name);
    await Promise.all([
      sendVerificationNotification(name, user.user.email),
      updateUserStatus(user.user_id),
    ]);

    return { error: false, message: "Verification successful" };
  } catch (error) {
    // logger.error("Verification status update failed", { error });
    throw error instanceof VerificationError
      ? error
      : new VerificationError("Failed to update verification status");
  }
};

// Worker setup
const AwsVerificationWorker = new Worker(
  "aws-verification",
  async (job) => {
    const { token, front, faceVideo } = job.data as VerificationJobData;
    try {
      const match = await processFaceComparison(front, faceVideo);
      const result = await updateVerificationStatus(token, match, front, faceVideo);
      // logger.info("Verification job completed", { jobId: job.id, result });
      return result;
    } catch (error) {
      // logger.error("Verification job failed", { jobId: job.id, error });
      throw error;
    }
  },
  { connection: redis }
);

// Event handlers
AwsVerificationWorker.on("failed", async (job) => {
  const logEntry = `${new Date().toISOString()} - Job ${job?.id} failed - ${JSON.stringify(job?.data)}`;
  await query.batchProcessLogs.create({
    data: {
      job_id: job?.id as string,
      job_name: job?.name,
      job_data: logEntry,
    },
  });
});

AwsVerificationWorker.on("completed", async (job) => {
  const logEntry = `${new Date().toISOString()} - Job ${job.id
    } completed - ${JSON.stringify(job.data)}`;
  await query.batchProcessLogs.create({
    data: {
      job_id: job.id as string,
      job_name: job.name,
      job_data: logEntry,
    },
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await AwsVerificationWorker.close();
  await AwsVerificationQueue.close();
  // logger.info("Worker and queue closed gracefully");
});

export { AwsVerificationQueue };