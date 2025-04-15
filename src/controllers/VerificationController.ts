import VerificationService from "@services/VerificationService";
import type { Request, Response } from "express";
import type { AuthUser } from "types/user";
import fs from "fs";
import { AwsVerificationService } from "@services/AwsVerificationService";
import _, { attempt } from "lodash";
import { AwsFaceVerification } from "@services/AwsRekognitionFacialVerification";
import query from "@utils/prisma";
import { AwsVerificationQueue } from "@jobs/verifications/AwsFacialVerificationJob";

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
              .status(401)
              .json({ error: true, message: startVerification.message });
          }
          return res.status(200).json({
            error: false,
            message: startVerification.message,
            token: startVerification.token,
          });
        default:
          return res
            .status(401)
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
        return res.status(401).json(processVerification);
      }

      const verification = processVerification.verification;
      if (!verification) {
        res
          .status(401)
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
          attempts: 3,
        }
      );

      if (!processVerification || !ProcessVerification.id) {
        return res.status(401).json({
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
        return res.status(401).json(verifyToken);
      }
      return res.status(200).json(verifyToken);
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message });
    }
  }
}
