import VerificationService from "@services/VerificationService";
import type { Request, Response } from "express";
import type { AuthUser } from "types/user";
import fs from "fs";
import { AwsVerificationService } from "@services/AwsVerificationService";
import { AwsVerificationQueue } from "@jobs/verifications/AwsFacialVerificationJob";
import query from "@utils/prisma";

export default class VerificationController {
  // Model Verification
  // This function handles the model verification process.
  // It takes the action from the request body and calls the appropriate service.
  static async ModelVerification(req: Request, res: Response): Promise<any> {
    const { action } = req.body;
    try {
      switch (action) {
        case "start":
          const startVerification =
            await VerificationService.StartModelVerificationService({
              user: req.user as AuthUser,
            });
          if (startVerification.error) {
            return res
              .status(400)
              .json({ error: true, message: startVerification.message });
          }
          return res.status(200).json({
            error: false,
            message: startVerification.message,
            token: startVerification.token,
          });
        default:
          return res
            .status(400)
            .json({ error: true, message: "Invalid action" });
      }
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message });
    }
  }

  // Meta Map Verification
  // This function handles the meta map verification process.
  // It takes the action from the request body and calls the appropriate service.
  static async MetaMapVerification(req: Request, res: Response): Promise<any> {
    const path = __dirname + "/../../data.json";
    // Read the file, create it if it doesn't exist, and append new data
    fs.readFile(path, "utf8", (err, data) => {
      let jsonData = [];
      if (err) {
        // If the file doesn't exist, create it with an empty array
        if (err.code === "ENOENT") {
          jsonData = [];
        } else {
          console.error("Error reading file:", err);
        }
      } else {
        // Parse the existing data in the file
        try {
          jsonData = JSON.parse(data);
        } catch (parseError) {
          console.error("Error parsing JSON data:", parseError);
        }
      }
      // Append the new data from the request
      jsonData.push(req.body);

      // Write the updated data back to the file
      fs.writeFile(path, JSON.stringify(jsonData, null, 2), (err) => {
        if (err) {
          console.error("Error writing file:", err);
        }
        console.log("Data written to file");
      });
      res.status(200).json({
        error: false,
        message: "Meta Map Verification started",
      });
    });
  }

  // Process Verification
  // This function handles the process verification.
  // It takes the token from the request parameters and calls the appropriate service.

  static async ProcessVerification(req: Request, res: Response): Promise<any> {
    const { token } = req.params;
    const files = req.files as Express.Multer.File[];
    // Convert to array of objects
    const result = Object.values(files).flat();
    try {
      const processVerification =
        await AwsVerificationService.ProcessVerification({
          token,
          files: result,
          ...req.body,
        });

      if (processVerification.error) {
        return res.status(400).json(processVerification);
      }

      const verification = processVerification.verification;
      if (!verification) {
        res
          .status(400)
          .json({ error: true, message: "Verification not found" });
        return;
      }

      // Aws Data Verification ID Details & Country Match With User
      // Coming in Later

      const ProcessVerification = await AwsVerificationQueue.add(
        "VerifyUser",
        {
          token: token,
          front: verification.front,
          back: verification.back,
          faceVideo: verification.faceVideo,
        },
        {
          removeOnComplete: true,
          attempts: 3,
        }
      );

      if (!processVerification || !ProcessVerification.id) {
        return res.status(400).json({
          error: true,
          token: token,
          message: "An Error occurred while processing the verification",
        });
      }

      res.status(200).json({
        error: false,
        message: "Verification Processed",
        token: token,
      });
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message });
    }
  }

  // Verify Token
  // This function verifies the token before processing the verification.
  static async VerifyToken(req: Request, res: Response): Promise<any> {
    const { token } = req.body;
    try {
      const verifyToken = await VerificationService.VerifyTokenService({
        token,
      });
      if (verifyToken.error) {
        return res.status(400).json(verifyToken);
      }
      return res.status(200).json(verifyToken);
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message });
    }
  }

  // Check Verification Status
  // This function checks the current status of a verification by token
  static async CheckVerificationStatus(req: Request, res: Response): Promise<any> {
    const { token } = req.params;
    try {
      const verification = await query.model.findFirst({
        where: {
          token: token,
        },
        select: {
          verification_state: true,
          verification_status: true,
          created_at: true,
          user: {
            select: {
              name: true,
            }
          }
        },
      });

      if (!verification) {
        return res.status(404).json({
          error: true,
          message: "Verification not found",
        });
      }

      // Calculate time elapsed since submission
      const timeElapsed = Date.now() - verification.created_at.getTime();
      const minutesElapsed = Math.floor(timeElapsed / (1000 * 60));

      return res.status(200).json({
        error: false,
        verification_state: verification.verification_state,
        verification_status: verification.verification_status,
        minutes_elapsed: minutesElapsed,
        user_name: verification.user.name,
      });
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message });
    }
  }

  // Debug Queue Status
  // This function checks the current queue status for debugging
  static async DebugQueueStatus(_: Request, res: Response): Promise<any> {
    try {
      const { AwsVerificationQueue } = await import("@jobs/verifications/AwsFacialVerificationJob");

      const waiting = await AwsVerificationQueue.getWaiting();
      const active = await AwsVerificationQueue.getActive();
      const completed = await AwsVerificationQueue.getCompleted();
      const failed = await AwsVerificationQueue.getFailed();

      return res.status(200).json({
        error: false,
        queue_status: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          jobs: {
            waiting: waiting.slice(0, 5).map(job => ({ id: job.id, data: job.data.token })),
            active: active.slice(0, 5).map(job => ({ id: job.id, data: job.data.token })),
            failed: failed.slice(0, 5).map(job => ({ id: job.id, failedReason: job.failedReason })),
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message });
    }
  }

  // Manual Verification Trigger (for debugging)
  // This function manually triggers verification processing bypassing the queue
  static async ManualVerificationTrigger(req: Request, res: Response): Promise<any> {
    const { token } = req.params;
    try {
      // Get verification data
      const verification = await query.model.findFirst({
        where: { token },
        select: {
          id: true,
          verification_state: true,
        }
      });

      if (!verification) {
        return res.status(404).json({
          error: true,
          message: "Verification not found",
        });
      }

      if (verification.verification_state !== "started") {
        return res.status(400).json({
          error: true,
          message: "Verification is not in started state",
        });
      }

      // Trigger manual processing (for debugging)
      const { AwsVerificationQueue } = await import("@jobs/verifications/AwsFacialVerificationJob");

      // Add a job to process this verification manually
      const job = await AwsVerificationQueue.add(
        "ManualVerifyUser",
        {
          token: token,
          // Note: In real scenario, these would come from the original upload
          // For debugging, we'll let the job handle missing data gracefully
        },
        {
          removeOnComplete: false, // Keep for debugging
          attempts: 1,
        }
      );

      return res.status(200).json({
        error: false,
        message: "Manual verification triggered",
        job_id: job.id,
        token: token,
      });
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message });
    }
  }
}
