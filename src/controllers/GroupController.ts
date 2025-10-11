import type { Request, Response } from "express";
import GroupService from "../services/GroupService";
import type { AuthUser } from "../types/user";
import type {
  CreateGroupRequest,
  UpdateGroupRequest,
  UpdateGroupSettingsRequest,
  SendGroupMessageRequest,
  GroupSearchParams,
  GroupMemberParams,
  GroupMessagesParams,
  InviteToGroupRequest,
  UpdateMemberRoleRequest,
} from "../types/groups";
import { UploadImageToS3 } from "../libs/UploadImageToS3";
import { config } from "@configs/config";
import { v4 as uuid } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@utils/aws";
import query from "@utils/prisma";

export default class GroupController {
  // Create a new group
  static async CreateGroup(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const data: CreateGroupRequest = req.body;

      // Validate required fields
      if (!data.name || !data.groupType) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Group name and type are required",
        });
      }

      const result = await GroupService.createGroup(user, data);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error("Error in createGroup:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Get user's groups
  static async getUserGroups(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const params: GroupSearchParams = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        query: req.query.query as string,
        groupType: req.query.groupType as any,
      };
      const result = await GroupService.getUserGroups(user, params);
      if (result.error) {
        return res.status(400).json(result);
      }

      // Transform response to match frontend expectations
      const transformedResult = {
        success: result.success,
        data: {
          userGroups: result.data?.groups || [],
          userGroupsCount: result.data?.pagination?.total || 0,
        },
      };
      return res.status(200).json(transformedResult);
    } catch (error) {
      console.error("Error in getUserGroups:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Get group by ID
  static async getGroupById(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.getGroupById(user, groupId);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in getGroupById:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Check if current user is blocked from group
  static async checkUserBlocked(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.checkUserBlocked(user, groupId);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in checkUserBlocked:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Update group
  static async updateGroup(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      const data: UpdateGroupRequest = req.body;

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.updateGroup(user, groupId, data);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in updateGroup:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Update group settings
  static async updateGroupSettings(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      const data: UpdateGroupSettingsRequest = req.body;

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.updateGroupSettings(
        user,
        groupId,
        data
      );

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in updateGroupSettings:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Send group message
  static async sendMessage(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      const data: SendGroupMessageRequest = {
        content: req.body.content,
        messageType: req.body.messageType,
        replyToId: req.body.replyToId
          ? parseInt(req.body.replyToId)
          : undefined,
        attachments: req.files as Express.Multer.File[],
      };

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      if (
        !data.content &&
        (!data.attachments || data.attachments.length === 0)
      ) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Message content or attachments are required",
        });
      }

      const result = await GroupService.sendMessage(user, groupId, data);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in sendMessage:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Get group messages
  static async getGroupMessages(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      const params: GroupMessagesParams = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        cursor: req.query.cursor
          ? parseInt(req.query.cursor as string)
          : undefined,
      };

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.getGroupMessages(user, groupId, params);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in getGroupMessages:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Join group
  static async joinGroup(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      // const data: JoinGroupRequest = req.body;

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.joinGroup(user, groupId);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in joinGroup:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Leave group
  static async leaveGroup(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.leaveGroup(user, groupId);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in leaveGroup:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Invite users to group
  static async inviteToGroup(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      const data: InviteToGroupRequest = req.body;

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      if (
        !data.userIds ||
        !Array.isArray(data.userIds) ||
        data.userIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "User IDs array is required",
        });
      }

      const result = await GroupService.inviteToGroup(user, groupId, data);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in inviteToGroup:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Accept group invitation
  static async acceptInvitation(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const invitationId = parseInt(req.params.invitationId);

      if (isNaN(invitationId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid invitation ID",
        });
      }

      const result = await GroupService.acceptInvitation(user, invitationId);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in acceptInvitation:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Decline group invitation
  static async declineInvitation(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const invitationId = parseInt(req.params.invitationId);

      if (isNaN(invitationId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid invitation ID",
        });
      }

      const result = await GroupService.declineInvitation(user, invitationId);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in declineInvitation:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Get group members
  static async getGroupMembers(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      const params: GroupMemberParams = {
        cursor: req.query.cursor
          ? parseInt(req.query.cursor as string)
          : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        role: req.query.role as any,
      };

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.getGroupMembers(user, groupId, params);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in getGroupMembers:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Update member role
  static async updateMemberRole(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      const memberId = parseInt(req.params.memberId);
      const data: UpdateMemberRoleRequest = req.body;

      if (isNaN(groupId) || isNaN(memberId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID or member ID",
        });
      }

      if (!data.role) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Role is required",
        });
      }

      const result = await GroupService.updateMemberRole(
        user,
        groupId,
        memberId,
        data
      );

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in updateMemberRole:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Remove member from group
  static async removeMember(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      const memberId = parseInt(req.params.memberId);

      if (isNaN(groupId) || isNaN(memberId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID or member ID",
        });
      }

      const result = await GroupService.removeMember(user, groupId, memberId);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in removeMember:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Approve join request
  static async approveJoinRequest(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const requestId = parseInt(req.params.requestId);

      if (isNaN(requestId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid request ID",
        });
      }

      const result = await GroupService.approveJoinRequest(user, requestId);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in approveJoinRequest:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Reject join request
  static async rejectJoinRequest(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const requestId = parseInt(req.params.requestId);

      if (isNaN(requestId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid request ID",
        });
      }

      const result = await GroupService.rejectJoinRequest(user, requestId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in rejectJoinRequest:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Get join requests for group
  static async getJoinRequests(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);
      const params = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
      };

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.getJoinRequests(user, groupId, params);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in getJoinRequests:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Search groups
  static async MainGroup(_: Request, res: Response): Promise<any> {
    try {
      const result = await GroupService.MainGroup();
      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in searchGroups:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Get user's group statistics
  static async getUserGroupStats(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;

      const result = await GroupService.getUserGroupStats(user);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in getUserGroupStats:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Delete group
  static async deleteGroup(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const groupId = parseInt(req.params.groupId);

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid group ID",
        });
      }

      const result = await GroupService.deleteGroup(user, groupId);

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in deleteGroup:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Get user's invitations
  static async getUserInvitations(req: Request, res: Response): Promise<any> {
    try {
      const params = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      // This would need to be implemented in GroupService
      // For now, return a placeholder response
      return res.status(200).json({
        success: true,
        data: {
          invitations: [],
          pagination: {
            page: params.page,
            limit: params.limit,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
      });
    } catch (error) {
      console.error("Error in getUserInvitations:", error);
      return res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Upload attachment for group messages
  static async uploadAttachment(req: Request, res: Response): Promise<any> {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "No files uploaded",
        });
      }

      // Process each file and upload to S3
      const uploadResults = [];

      for (const file of files) {
        try {
          let fileUrl: string;

          // Check if it's an image to upload to S3 with optimization
          if (file.mimetype.startsWith("image/")) {
            fileUrl = await UploadImageToS3({
              file: file,
              folder: "group-attachments",
              format: "webp",
              quality: 85,
              resize: {
                width: 1200,
                height: null,
                fit: "inside",
              },
              contentType: "image/webp",
              deleteLocal: true,
            });
          } else {
            // For non-images, upload to S3 as-is
            fileUrl = await UploadImageToS3({
              file: file,
              folder: "group-attachments",
              contentType: file.mimetype,
              deleteLocal: true,
            });
          }

          uploadResults.push({
            fileName: file.originalname,
            fileUrl: fileUrl,
            fileType: file.mimetype,
            fileSize: file.size,
            tempPath: file.path, // Include temp path for socket handler
          });
        } catch (uploadError) {
          console.error("Error uploading file:", uploadError);
          // Continue with other files even if one fails
          uploadResults.push({
            fileName: file.originalname,
            fileUrl: null,
            fileType: file.mimetype,
            fileSize: file.size,
            error: "Upload failed",
          });
        }
      }

      return res.status(200).json({
        success: true,
        error: false,
        message: "Files uploaded successfully",
        data: {
          attachments: uploadResults.filter((result) => !result.error),
        },
      });
    } catch (error) {
      console.error("Error in uploadAttachment:", error);
      return res.status(500).json({
        success: false,
        error: true,
        message: `Internal Server Error: ${error}`,
      });
    }
  }

  // Get Presigned URLs for direct S3 upload (Group Messages)
  static async GetPresignedUrls(req: Request, res: Response): Promise<any> {
    try {
      const { files } = req.body as {
        files: Array<{
          name: string;
          type: string;
          size: number;
          media_id?: string;
        }>;
      };

      if (!files || !Array.isArray(files)) {
        return res.status(400).json({
          message: "Files array is required",
          status: false,
        });
      }

      const urlPromises = files.map(async (file) => {
        const fileExtension = file.name.split(".").pop();
        const media_id = file.media_id || uuid();
        const isVideo = file.type.startsWith("video/");

        let key: string;
        if (isVideo) {
          key = `process/${media_id}.${fileExtension}`;
        } else {
          key = `groups/${media_id}.${fileExtension}`;
        }

        const putObjectCommand = new PutObjectCommand({
          Bucket: config.mainPaymefansBucket!,
          Key: key,
          ContentType: file.type,
        });

        const presignedUrl = await getSignedUrl(s3, putObjectCommand, {
          expiresIn: 3600, // 1 hour
        });

        return {
          media_id,
          presignedUrl,
          key,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          isVideo,
        };
      });

      const urls = await Promise.all(urlPromises);

      res.status(200).json({
        error: false,
        data: urls,
        status: true,
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        message: "An error occurred while generating presigned URLs",
        error: error.message,
        status: false,
      });
    }
  }

  // Complete Upload - Save uploaded file info to database (Group Messages)
  static async CompleteUpload(req: Request, res: Response): Promise<any> {
    try {
      const { uploadedFiles } = req.body as {
        uploadedFiles: Array<{
          media_id: string;
          key: string;
          fileName: string;
          fileType: string;
          fileSize: number;
          isVideo: boolean;
        }>;
      };

      if (!uploadedFiles || !Array.isArray(uploadedFiles)) {
        return res.status(400).json({
          message: "Uploaded files array is required",
          status: false,
        });
      }

      const transaction = await query.$transaction(async (tx) => {
        const savedFiles = uploadedFiles.map(async (file) => {
          const cloudfrontUrl = file.isVideo
            ? `${config.processedCloudfrontUrl}/${file.key
                .split(".")
                .slice(0, -1)
                .join(".")}.mp4`
            : `${config.mainCloudfrontUrl}/${file.key}`;

          await tx.uploadedMedia.create({
            data: {
              user_id: (req.user as AuthUser).id,
              media_id: file.media_id,
              name: file.fileName,
              type: file.isVideo ? "video" : "image",
              url: cloudfrontUrl,
              size: file.fileSize,
              extension: file.fileName.split(".").slice(-1)[0],
              key: file.key,
            },
          });

          return {
            url: cloudfrontUrl,
            mimetype: file.fileType,
            filename: file.fileName,
            media_state: file.isVideo ? "processing" : "completed",
            media_id: file.media_id,
            size: file.fileSize,
          };
        });

        return Promise.all(savedFiles);
      });

      res.status(200).json({
        error: false,
        data: transaction,
        status: true,
      });
    } catch (error: any) {
      console.log("Transaction failed: ", error);
      res.status(500).json({
        message: "An error occurred while completing upload",
        error: error.message,
        status: false,
      });
    }
  }
}
