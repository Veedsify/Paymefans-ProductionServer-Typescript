import VerificationService from "@services/VerificationService";
import type { Request, Response } from "express";
import type { AuthUser } from "types/user";
import fs from "fs";

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
            await VerificationService.Startmodelverificationservice({
              user: req.user as AuthUser,
            });
          if (startVerification.error) {
            return res
              .status(401)
              .json({ error: true, message: startVerification.message });
          }
          return res
            .status(200)
            .json({
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
     const path = __dirname + '/../../data.json'
            // Read the file, create it if it doesn't exist, and append new data
            fs.readFile(path, "utf8", (err, data) => {
                let jsonData = [];
                if (err) {
                    // If the file doesn't exist, create it with an empty array
                    if (err.code === 'ENOENT') {
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
                })
            });
  }
}
