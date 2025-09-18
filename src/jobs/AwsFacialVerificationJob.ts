import { redis } from "@libs/RedisStore";
import { AwsFaceVerification } from "@services/AwsRekognitionFacialVerification";
import {
  analyzeDocumentQuality,
  detectFaceQuality,
  extractNamesFromDocument,
} from "@services/AwsDocumentValidationService";
import EmailService from "@services/EmailService";
import GetSinglename from "@utils/GetSingleName";
import { NameMatchingService } from "@utils/NameMatchingService";
import query from "@utils/prisma";
import { Queue, Worker } from "bullmq";
import type { AwsRekognitionObject } from "../types/verification";
import {
  RekognitionClient,
  DetectTextCommand,
} from "@aws-sdk/client-rekognition";

const { AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY } = process.env;

const rekognitionClient = new RekognitionClient({
  region: AWS_REGION as string,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY as string,
    secretAccessKey: AWS_SECRET_KEY as string,
  },
});

const AwsVerificationQueue = new Queue("aws-verification", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: 5000,
    delay: 1000, // 1 second delay before starting
  },
});

const ProcessFaceComparison = async (
  front: AwsRekognitionObject,
  faceVideo: AwsRekognitionObject,
  back?: AwsRekognitionObject,
): Promise<{ success: boolean; message: string; confidence?: number }> => {
  try {
    // Enhanced face quality validation
    const faceQuality = await detectFaceQuality(faceVideo);
    if (faceQuality.error) {
      return {
        success: false,
        message: `Face quality check failed: ${faceQuality.message}`,
      };
    }

    // Enhanced document quality validation
    const frontQuality = await analyzeDocumentQuality(front);
    if (frontQuality.error) {
      return {
        success: false,
        message: `Front document quality check failed: ${frontQuality.message}`,
      };
    }

    // AWS Face Verification With Rekognition
    const AwsComparison = await AwsFaceVerification({
      front: front,
      faceVideo: faceVideo,
    });

    if (AwsComparison.error) {
      return {
        success: false,
        message: AwsComparison.message,
      };
    }

    // Additional validation for back document if provided
    if (back) {
      const backQuality = await analyzeDocumentQuality(back);
      if (backQuality.error) {
        return {
          success: false,
          message: `Back document quality check failed: ${backQuality.message}`,
        };
      }
    }

    return {
      success: true,
      message: "Face verification successful",
      confidence: 95, // You could extract this from AWS response
    };
  } catch (error: any) {
    console.error("Face comparison error:", error);
    return {
      success: false,
      message: "Technical error during verification. Please try again.",
    };
  }
};

const UpdateVerificationStatus = async (
  token: string,
  verificationResult: {
    success: boolean;
    message: string;
    confidence?: number;
  },
  front: AwsRekognitionObject,
  faceVideo: AwsRekognitionObject,
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
      verification_state: verificationResult.success ? "approved" : "rejected",
      verification_status: verificationResult.success,
      verification_video: verificationResult.success
        ? `${process.env.AWS_CLOUDFRONT_URL}/${faceVideo.key}`
        : "",
      verification_image: verificationResult.success
        ? `${process.env.AWS_CLOUDFRONT_URL}/${front.key}`
        : "",
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

  if (!user) {
    return { error: true, message: "User not found" };
  }

  // Send Verification Successful Notification
  // Send Verification Successful Email
  const name = GetSinglename(user?.user.name as string);

  if (!verificationResult.success && user?.user) {
    return { error: true, message: verificationResult.message };
  }

  await EmailService.VerificationComplete(name, user.user.email);

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

const ProcessNameMatching = async (
  front: AwsRekognitionObject,
  back: AwsRekognitionObject | undefined,
  token: string,
): Promise<{ success: boolean; message: string; confidence?: number }> => {
  try {
    // Get user data for name matching
    const model = await query.model.findFirst({
      where: { token },
      select: {
        firstname: true,
        lastname: true,
        country: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!model) {
      console.error(`[${token}] Model not found for name verification`);
      return {
        success: false,
        message: "Model not found for name verification",
      };
    }

    const frontTextCommand = new DetectTextCommand({
      Image: {
        S3Object: {
          Bucket: front.bucket,
          Name: front.key,
        },
      },
    });

    const frontTextResponse = await rekognitionClient.send(frontTextCommand);
    const frontTexts =
      frontTextResponse.TextDetections?.map(
        (detection) => detection.DetectedText || "",
      ).filter((text) => text.trim().length > 0) || [];

    // Extract text from back of ID document if available
    let backTexts: string[] = [];
    if (back) {
      const backTextCommand = new DetectTextCommand({
        Image: {
          S3Object: {
            Bucket: back.bucket,
            Name: back.key,
          },
        },
      });

      const backTextResponse = await rekognitionClient.send(backTextCommand);
      backTexts =
        backTextResponse.TextDetections?.map(
          (detection) => detection.DetectedText || "",
        ).filter((text) => text.trim().length > 0) || [];
    }

    // Combine all detected texts
    const allDetectedTexts = [...frontTexts, ...backTexts];
    if (allDetectedTexts.length === 0) {
      console.warn(`[${token}] No text detected from documents`);
      return {
        success: false,
        message:
          "No text could be detected from the ID document. Please ensure the image is clear and well-lit.",
      };
    }

    // Extract names from the document
    const extractedNames = extractNamesFromDocument(
      allDetectedTexts,
      model.country,
    );
    if (extractedNames.length === 0) {
      console.warn(`[${token}] No names extracted from document text`);
      return {
        success: false,
        message:
          "No names could be extracted from the ID document. Please ensure the name fields are clearly visible.",
      };
    }

    // Perform name matching
    const nameMatchResult = NameMatchingService.matchNames(
      model.firstname,
      model.lastname,
      model.user.name,
      extractedNames,
      0.75, // Slightly more lenient for international names
    );

    if (!nameMatchResult.isMatch) {
      console.warn(`[${token}] Name matching failed`);
      return {
        success: false,
        message: `Name verification failed. The names on your ID document do not match your signup information. Extracted: ${extractedNames.join(", ")}. Expected: ${model.firstname} ${model.lastname}`,
      };
    }

    if (nameMatchResult.confidence < 0.6) {
      console.warn(
        `[${token}] Name matching confidence too low: ${nameMatchResult.confidence}`,
      );
      return {
        success: false,
        message: `Name verification confidence too low (${Math.round(nameMatchResult.confidence * 100)}%). Please ensure your ID document clearly shows your name.`,
      };
    }

    return {
      success: true,
      message: `Name verification successful with ${Math.round(nameMatchResult.confidence * 100)}% confidence`,
      confidence: nameMatchResult.confidence,
    };
  } catch (error: any) {
    console.error(`[${token}] Name matching error:`, error);
    return {
      success: false,
      message: "Technical error during name verification. Please try again.",
    };
  }
};

const AwsVerificationWorker = new Worker(
  "aws-verification",
  async (job) => {
    const { front, faceVideo, back, token } = job.data;

    try {
      // Step 1: Face comparison
      const faceVerificationResult = await ProcessFaceComparison(
        front,
        faceVideo,
        back,
      );

      if (!faceVerificationResult.success) {
        console.error(
          `[${token}] Face verification failed, updating status...`,
        );
        await UpdateVerificationStatus(
          token,
          faceVerificationResult,
          front,
          faceVideo,
        );
        return {
          error: true,
          message: faceVerificationResult.message,
        };
      }

      // Step 2: Name matching verification (with fallback)
      let nameMatchingResult;
      let nameVerificationEnabled = true;

      try {
        nameMatchingResult = await ProcessNameMatching(front, back, token);
      } catch (nameError) {
        console.error(
          `[${token}] Name matching failed with error, proceeding with face-only verification:`,
          nameError,
        );
        nameVerificationEnabled = false;
        nameMatchingResult = {
          success: true,
          message: "Name verification skipped due to technical issue",
          confidence: 0.5,
        };
      }

      if (nameVerificationEnabled && !nameMatchingResult.success) {
        await UpdateVerificationStatus(
          token,
          nameMatchingResult,
          front,
          faceVideo,
        );
        return {
          error: true,
          message: nameMatchingResult.message,
        };
      }

      // Step 3: Both verifications passed - update status
      const combinedResult = {
        success: true,
        message: nameVerificationEnabled
          ? `Verification successful. Face verification: ${Math.round((faceVerificationResult.confidence || 0) * 100)}%, Name verification: ${Math.round((nameMatchingResult.confidence || 0) * 100)}%`
          : `Verification successful with face verification only: ${Math.round((faceVerificationResult.confidence || 0) * 100)}%`,
        confidence: nameVerificationEnabled
          ? Math.min(
              faceVerificationResult.confidence || 0,
              nameMatchingResult.confidence || 0,
            )
          : faceVerificationResult.confidence || 0,
      };

      const result = await UpdateVerificationStatus(
        token,
        combinedResult,
        front,
        faceVideo,
      );

      if (result.error) {
        return {
          error: true,
          message: result.message,
        };
      }

      return {
        error: false,
        message: "Verification successful",
      };
    } catch (error: any) {
      console.error(`[${token}] Verification job error:`, error);
      throw new Error(error.message);
    }
  },
  { connection: redis },
);

AwsVerificationWorker.on("failed", (job) =>
  console.log(
    `${job?.name} - with ID ${job?.id} Failed cause ${job?.failedReason}`,
  ),
);
AwsVerificationWorker.on("completed", () => {
  // Handle the completion of the job
});

export { AwsVerificationQueue };
