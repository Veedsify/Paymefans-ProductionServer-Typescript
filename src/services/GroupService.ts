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
  JoinGroupRequest,
  UpdateMemberRoleRequest,
  GroupServiceResponse,
  GroupListResponse,
  GroupMembersResponse,
  GroupMessagesResponse,
  GroupJoinRequestsResponse,
  GroupInvitationsResponse,
  UserGroupStats,
  GroupWithDetails,
  GroupMemberWithUser,
  GroupMessageWithDetails,
  GroupJoinRequestWithUser,
  GroupInvitationWithDetails,
} from "../types/groups";
import query from "../utils/prisma";
import {
  GroupType,
  GroupMemberRole,
  JoinRequestStatus,
  InvitationStatus,
} from "@prisma/client";

export default class GroupService {
  // Create a new group
  static async createGroup(
    user: AuthUser,
    data: CreateGroupRequest,
  ): Promise<GroupServiceResponse<GroupWithDetails>> {
    try {
      // if (!user.is_active) {
      //   return {
      //     success: false,
      //     error: true,
      //     message: "Account must be active to create groups",
      //   };
      // }

      // Create group with proper schema fields
      const group = await query.groups.create({
        data: {
          name: data.name,
          description: data.description || null,
          groupType: data.groupType,
          maxMembers: data.maxMembers || 100,
          groupIcon: data.groupIcon || null,
          adminId: user.id,
          isActive: true,
          settings: data.settings
            ? {
                create: {
                  allowMemberInvites: data.settings.allowMemberInvites ?? true,
                  allowMediaSharing: data.settings.allowMediaSharing ?? true,
                  allowFileSharing: data.settings.allowFileSharing ?? true,
                  moderateMessages: data.settings.moderateMessages ?? false,
                  autoApproveJoinReqs:
                    data.settings.autoApproveJoinReqs ?? true,
                },
              }
            : undefined,
        },
        include: {
          admin: true,
          members: {
            include: {
              user: true,
            },
          },
          settings: true,
          _count: {
            select: {
              members: true,
              messages: true,
              joinRequests: true,
            },
          },
        },
      });

      // Add admin as first member
      await query.groupMember.create({
        data: {
          userId: user.id,
          groupId: group.id,
          role: GroupMemberRole.ADMIN,
          joinedAt: new Date(),
        },
      });

      return {
        success: true,
        data: group as GroupWithDetails,
        message: "Group created successfully",
      };
    } catch (error) {
      console.error("Error creating group:", error);
      return {
        success: false,
        error: true,
        message: "Failed to create group",
      };
    }
  }

  // Get user's groups
  static async getUserGroups(
    user: AuthUser,
    params: GroupSearchParams = {},
  ): Promise<GroupServiceResponse<GroupListResponse>> {
    try {
      const { page = 1, limit = 20, query: searchQuery, groupType } = params;
      const skip = (page - 1) * limit;

      let whereClause: any = {
        members: {
          some: {
            userId: user.id,
          },
        },
      };

      // Add search functionality if query provided
      if (searchQuery) {
        whereClause = {
          ...whereClause,
          OR: [
            {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          ],
        };
      }

      // Add group type filter
      if (groupType) {
        whereClause.groupType = groupType;
      }

      const [groups, total] = await Promise.all([
        query.groups.findMany({
          where: whereClause,
          include: {
            admin: true,
            members: {
              take: 5,
              include: {
                user: true,
              },
            },
            settings: true,
            _count: {
              select: {
                members: true,
                messages: true,
                joinRequests: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: {
            updatedAt: "desc",
          },
        }),
        query.groups.count({
          where: whereClause,
        }),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          groups: groups as GroupWithDetails[],
          pagination: {
            page,
            limit,
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching user groups:", error);
      return {
        success: false,
        error: true,
        message: "Failed to fetch user groups",
      };
    }
  }

  // Get group by ID
  static async getGroupById(
    user: AuthUser,
    groupId: number,
  ): Promise<GroupServiceResponse<GroupWithDetails>> {
    try {
      const group = await query.groups.findFirst({
        where: {
          id: groupId,
          OR: [
            // User is a member
            {
              members: {
                some: {
                  userId: user.id,
                },
              },
            },
            // Or it's a public group
            {
              groupType: GroupType.PUBLIC,
            },
          ],
        },
        include: {
          admin: true,
          members: {
            include: {
              user: true,
            },
          },
          settings: true,
          _count: {
            select: {
              members: true,
              messages: true,
              joinRequests: true,
            },
          },
        },
      });

      if (!group) {
        return {
          success: false,
          error: true,
          message: "Group not found or access denied",
        };
      }

      return {
        success: true,
        data: group as GroupWithDetails,
      };
    } catch (error) {
      console.error("Error fetching group:", error);
      return {
        success: false,
        error: true,
        message: "Failed to fetch group",
      };
    }
  }

  // Update group
  static async updateGroup(
    user: AuthUser,
    groupId: number,
    data: UpdateGroupRequest,
  ): Promise<GroupServiceResponse<GroupWithDetails>> {
    try {
      // Check if user is admin
      const group = await query.groups.findFirst({
        where: {
          id: groupId,
          adminId: user.id,
        },
      });

      if (!group) {
        return {
          success: false,
          error: true,
          message: "Group not found or insufficient permissions",
        };
      }

      const updatedGroup = await query.groups.update({
        where: { id: groupId },
        data: {
          name: data.name,
          description: data.description,
          groupType: data.groupType,
          maxMembers: data.maxMembers,
          groupIcon: data.groupIcon,
          updatedAt: new Date(),
        },
        include: {
          admin: true,
          members: {
            include: {
              user: true,
            },
          },
          settings: true,
          _count: {
            select: {
              members: true,
              messages: true,
              joinRequests: true,
            },
          },
        },
      });

      return {
        success: true,
        data: updatedGroup as GroupWithDetails,
        message: "Group updated successfully",
      };
    } catch (error) {
      console.error("Error updating group:", error);
      return {
        success: false,
        error: true,
        message: "Failed to update group",
      };
    }
  }

  // Update group settings
  static async updateGroupSettings(
    user: AuthUser,
    groupId: number,
    data: UpdateGroupSettingsRequest,
  ): Promise<GroupServiceResponse<any>> {
    try {
      // Check if user is admin
      const group = await query.groups.findFirst({
        where: {
          id: groupId,
          adminId: user.id,
        },
      });

      if (!group) {
        return {
          success: false,
          error: true,
          message: "Group not found or insufficient permissions",
        };
      }

      const settings = await query.groupSettings.upsert({
        where: { groupId },
        update: {
          allowMemberInvites: data.allowMemberInvites,
          allowMediaSharing: data.allowMediaSharing,
          allowFileSharing: data.allowFileSharing,
          moderateMessages: data.moderateMessages,
          autoApproveJoinReqs: data.autoApproveJoinReqs,
          updatedAt: new Date(),
        },
        create: {
          groupId,
          allowMemberInvites: data.allowMemberInvites ?? true,
          allowMediaSharing: data.allowMediaSharing ?? true,
          allowFileSharing: data.allowFileSharing ?? true,
          moderateMessages: data.moderateMessages ?? false,
          autoApproveJoinReqs: data.autoApproveJoinReqs ?? true,
        },
      });

      return {
        success: true,
        data: settings,
        message: "Group settings updated successfully",
      };
    } catch (error) {
      console.error("Error updating group settings:", error);
      return {
        success: false,
        error: true,
        message: "Failed to update group settings",
      };
    }
  }

  // Send message to group
  static async sendMessage(
    user: AuthUser,
    groupId: number,
    data: SendGroupMessageRequest,
  ): Promise<GroupServiceResponse<GroupMessageWithDetails>> {
    try {
      // Check if user is a member
      const membership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!membership) {
        return {
          success: false,
          error: true,
          message: "You are not a member of this group",
        };
      }

      // Check if user is muted
      if (
        membership.isMuted &&
        membership.mutedUntil &&
        membership.mutedUntil > new Date()
      ) {
        return {
          success: false,
          error: true,
          message: "You are muted in this group",
        };
      }

      const message = await query.groupMessage.create({
        data: {
          content: data.content,
          senderId: user.id,
          groupId: groupId,
          messageType: data.messageType || "text",
          replyToId: data.replyToId,
        },
        include: {
          sender: true,
          attachments: true,
          replyTo: true,
          tags: {
            include: {
              user: true,
            },
          },
        },
      });

      // Handle attachments if provided
      if (data.attachments && data.attachments.length > 0) {
        for (const file of data.attachments) {
          await query.groupAttachment.create({
            data: {
              url: `/uploads/${file.filename}`, // You'll need to implement proper file upload
              type: file.mimetype.split("/")[0],
              fileName: file.originalname,
              fileSize: file.size,
              messageId: message.id,
            },
          });
        }
      }

      return {
        success: true,
        data: message as GroupMessageWithDetails,
        message: "Message sent successfully",
      };
    } catch (error) {
      console.error("Error sending message:", error);
      return {
        success: false,
        error: true,
        message: "Failed to send message",
      };
    }
  }

  // Get group messages
  static async getGroupMessages(
    user: AuthUser,
    groupId: number,
    params: GroupMessagesParams = {},
  ): Promise<GroupServiceResponse<GroupMessagesResponse>> {
    try {
      const { page = 1, limit = 50, cursor } = params;
      const skip = (page - 1) * limit;

      // Check if user is a member
      const membership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!membership) {
        return {
          success: false,
          error: true,
          message: "You are not a member of this group",
        };
      }

      const whereClause: any = {
        groupId: groupId,
      };

      if (cursor) {
        whereClause.id = { lt: cursor };
      }

      const [messages, total] = await Promise.all([
        query.groupMessage.findMany({
          where: whereClause,
          include: {
            sender: true,
            attachments: true,
            replyTo: true,
            tags: {
              include: {
                user: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
        }),
        query.groupMessage.count({
          where: { groupId },
        }),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          messages: messages as GroupMessageWithDetails[],
          pagination: {
            page,
            limit,
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
            cursor:
              messages.length > 0
                ? messages[messages.length - 1].id
                : undefined,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return {
        success: false,
        error: true,
        message: "Failed to fetch messages",
      };
    }
  }

  // Join group
  static async joinGroup(
    user: AuthUser,
    groupId: number,
    data: JoinGroupRequest,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const group = await query.groups.findFirst({
        where: { id: groupId },
        include: {
          settings: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!group) {
        return {
          success: false,
          error: true,
          message: "Group not found",
        };
      }

      // Check if already a member
      const existingMembership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (existingMembership) {
        return {
          success: false,
          error: true,
          message: "You are already a member of this group",
        };
      }

      // Check if group is full
      if (group._count.members >= group.maxMembers) {
        return {
          success: false,
          error: true,
          message: "Group is full",
        };
      }

      // Handle different group types
      if (group.groupType === GroupType.PUBLIC) {
        // For public groups, join directly
        await query.groupMember.create({
          data: {
            userId: user.id,
            groupId: groupId,
            role: GroupMemberRole.MEMBER,
            joinedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "Joined group successfully",
        };
      } else if (group.groupType === GroupType.PRIVATE) {
        // For private groups, create join request
        const existingRequest = await query.groupJoinRequest.findFirst({
          where: {
            userId: user.id,
            groupId: groupId,
          },
        });

        if (existingRequest) {
          return {
            success: false,
            error: true,
            message: "Join request already sent",
          };
        }

        await query.groupJoinRequest.create({
          data: {
            userId: user.id,
            groupId: groupId,
            message: data.message,
            status: JoinRequestStatus.PENDING,
          },
        });

        return {
          success: true,
          message: "Join request sent successfully",
        };
      } else {
        return {
          success: false,
          error: true,
          message: "Cannot join secret groups directly",
        };
      }
    } catch (error) {
      console.error("Error joining group:", error);
      return {
        success: false,
        error: true,
        message: "Failed to join group",
      };
    }
  }

  // Leave group
  static async leaveGroup(
    user: AuthUser,
    groupId: number,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const group = await query.groups.findFirst({
        where: { id: groupId },
      });

      if (!group) {
        return {
          success: false,
          error: true,
          message: "Group not found",
        };
      }

      // Check if user is admin
      if (group.adminId === user.id) {
        return {
          success: false,
          error: true,
          message: "Admin cannot leave group. Transfer ownership first.",
        };
      }

      const membership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!membership) {
        return {
          success: false,
          error: true,
          message: "You are not a member of this group",
        };
      }

      await query.groupMember.delete({
        where: {
          id: membership.id,
        },
      });

      return {
        success: true,
        message: "Left group successfully",
      };
    } catch (error) {
      console.error("Error leaving group:", error);
      return {
        success: false,
        error: true,
        message: "Failed to leave group",
      };
    }
  }

  // Invite users to group
  static async inviteToGroup(
    user: AuthUser,
    groupId: number,
    data: InviteToGroupRequest,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const group = await query.groups.findFirst({
        where: { id: groupId },
        include: {
          settings: true,
        },
      });

      if (!group) {
        return {
          success: false,
          error: true,
          message: "Group not found",
        };
      }

      // Check if user can invite
      const membership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!membership) {
        return {
          success: false,
          error: true,
          message: "You are not a member of this group",
        };
      }

      // Check permissions
      if (
        group.settings &&
        !group.settings.allowMemberInvites &&
        membership.role === GroupMemberRole.MEMBER
      ) {
        return {
          success: false,
          error: true,
          message: "You don't have permission to invite members",
        };
      }

      const invitations = [];

      for (const userId of data.userIds) {
        // Check if user exists
        const invitee = await query.user.findFirst({
          where: { id: userId },
        });

        if (!invitee) {
          continue;
        }

        // Check if already a member
        const existingMembership = await query.groupMember.findFirst({
          where: {
            userId: userId,
            groupId: groupId,
          },
        });

        if (existingMembership) {
          continue;
        }

        // Check if invitation already exists
        const existingInvitation = await query.groupInvitation.findFirst({
          where: {
            inviteeId: userId,
            groupId: groupId,
            status: InvitationStatus.PENDING,
          },
        });

        if (existingInvitation) {
          continue;
        }

        const invitation = await query.groupInvitation.create({
          data: {
            inviterId: user.id,
            inviteeId: userId,
            groupId: groupId,
            message: data.message,
            status: InvitationStatus.PENDING,
          },
        });

        invitations.push(invitation);
      }

      return {
        success: true,
        data: invitations,
        message: `${invitations.length} invitation(s) sent successfully`,
      };
    } catch (error) {
      console.error("Error inviting to group:", error);
      return {
        success: false,
        error: true,
        message: "Failed to invite users to group",
      };
    }
  }

  // Accept invitation
  static async acceptInvitation(
    user: AuthUser,
    invitationId: number,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const invitation = await query.groupInvitation.findFirst({
        where: {
          id: invitationId,
          inviteeId: user.id,
          status: InvitationStatus.PENDING,
        },
        include: {
          group: {
            include: {
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
        },
      });

      if (!invitation) {
        return {
          success: false,
          error: true,
          message: "Invitation not found or already processed",
        };
      }

      // Check if group is full
      if (invitation.group._count.members >= invitation.group.maxMembers) {
        return {
          success: false,
          error: true,
          message: "Group is full",
        };
      }

      // Check if already a member
      const existingMembership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: invitation.groupId,
        },
      });

      if (existingMembership) {
        return {
          success: false,
          error: true,
          message: "You are already a member of this group",
        };
      }

      // Accept invitation and join group
      await Promise.all([
        query.groupInvitation.update({
          where: { id: invitationId },
          data: {
            status: InvitationStatus.ACCEPTED,
            updatedAt: new Date(),
          },
        }),
        query.groupMember.create({
          data: {
            userId: user.id,
            groupId: invitation.groupId,
            role: GroupMemberRole.MEMBER,
            joinedAt: new Date(),
          },
        }),
      ]);

      return {
        success: true,
        message: "Invitation accepted successfully",
      };
    } catch (error) {
      console.error("Error accepting invitation:", error);
      return {
        success: false,
        error: true,
        message: "Failed to accept invitation",
      };
    }
  }

  // Decline invitation
  static async declineInvitation(
    user: AuthUser,
    invitationId: number,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const invitation = await query.groupInvitation.findFirst({
        where: {
          id: invitationId,
          inviteeId: user.id,
          status: InvitationStatus.PENDING,
        },
      });

      if (!invitation) {
        return {
          success: false,
          error: true,
          message: "Invitation not found or already processed",
        };
      }

      await query.groupInvitation.update({
        where: { id: invitationId },
        data: {
          status: InvitationStatus.DECLINED,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Invitation declined successfully",
      };
    } catch (error) {
      console.error("Error declining invitation:", error);
      return {
        success: false,
        error: true,
        message: "Failed to decline invitation",
      };
    }
  }

  // Get group members
  static async getGroupMembers(
    user: AuthUser,
    groupId: number,
    params: GroupMemberParams = {},
  ): Promise<GroupServiceResponse<GroupMembersResponse>> {
    try {
      const { page = 1, limit = 20, role } = params;
      const skip = (page - 1) * limit;

      // Check if user can view members
      const membership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!membership) {
        return {
          success: false,
          error: true,
          message: "You are not a member of this group",
        };
      }

      const whereClause: any = {
        groupId: groupId,
      };

      if (role) {
        whereClause.role = role;
      }

      const [members, total] = await Promise.all([
        query.groupMember.findMany({
          where: whereClause,
          include: {
            user: true,
            mutedByUser: true,
          },
          skip,
          take: limit,
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        }),
        query.groupMember.count({
          where: whereClause,
        }),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          members: members as GroupMemberWithUser[],
          pagination: {
            page,
            limit,
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching group members:", error);
      return {
        success: false,
        error: true,
        message: "Failed to fetch group members",
      };
    }
  }

  // Update member role
  static async updateMemberRole(
    user: AuthUser,
    groupId: number,
    memberId: number,
    data: UpdateMemberRoleRequest,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const group = await query.groups.findFirst({
        where: { id: groupId },
      });

      if (!group) {
        return {
          success: false,
          error: true,
          message: "Group not found",
        };
      }

      // Check if user has permission (admin or moderator)
      const userMembership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!userMembership || userMembership.role === GroupMemberRole.MEMBER) {
        return {
          success: false,
          error: true,
          message: "You don't have permission to update member roles",
        };
      }

      // Check if target member exists
      const targetMembership = await query.groupMember.findFirst({
        where: {
          id: memberId,
          groupId: groupId,
        },
      });

      if (!targetMembership) {
        return {
          success: false,
          error: true,
          message: "Member not found",
        };
      }

      // Admin can't change their own role
      if (targetMembership.userId === group.adminId) {
        return {
          success: false,
          error: true,
          message: "Cannot change admin role",
        };
      }

      // Only admin can promote to moderator
      if (
        data.role === GroupMemberRole.MODERATOR &&
        userMembership.role !== GroupMemberRole.ADMIN
      ) {
        return {
          success: false,
          error: true,
          message: "Only admin can promote to moderator",
        };
      }

      await query.groupMember.update({
        where: { id: memberId },
        data: {
          role: data.role,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Member role updated successfully",
      };
    } catch (error) {
      console.error("Error updating member role:", error);
      return {
        success: false,
        error: true,
        message: "Failed to update member role",
      };
    }
  }

  // Remove member
  static async removeMember(
    user: AuthUser,
    groupId: number,
    memberId: number,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const group = await query.groups.findFirst({
        where: { id: groupId },
      });

      if (!group) {
        return {
          success: false,
          error: true,
          message: "Group not found",
        };
      }

      // Check if user has permission (admin or moderator)
      const userMembership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!userMembership || userMembership.role === GroupMemberRole.MEMBER) {
        return {
          success: false,
          error: true,
          message: "You don't have permission to remove members",
        };
      }

      // Check if target member exists
      const targetMembership = await query.groupMember.findFirst({
        where: {
          id: memberId,
          groupId: groupId,
        },
      });

      if (!targetMembership) {
        return {
          success: false,
          error: true,
          message: "Member not found",
        };
      }

      // Can't remove admin
      if (targetMembership.userId === group.adminId) {
        return {
          success: false,
          error: true,
          message: "Cannot remove admin",
        };
      }

      // Moderator can't remove another moderator
      if (
        userMembership.role === GroupMemberRole.MODERATOR &&
        targetMembership.role === GroupMemberRole.MODERATOR
      ) {
        return {
          success: false,
          error: true,
          message: "Moderators cannot remove other moderators",
        };
      }

      await query.groupMember.delete({
        where: { id: memberId },
      });

      return {
        success: true,
        message: "Member removed successfully",
      };
    } catch (error) {
      console.error("Error removing member:", error);
      return {
        success: false,
        error: true,
        message: "Failed to remove member",
      };
    }
  }

  // Approve join request
  static async approveJoinRequest(
    user: AuthUser,
    requestId: number,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const joinRequest = await query.groupJoinRequest.findFirst({
        where: {
          id: requestId,
          status: JoinRequestStatus.PENDING,
        },
        include: {
          group: {
            include: {
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
        },
      });

      if (!joinRequest) {
        return {
          success: false,
          error: true,
          message: "Join request not found or already processed",
        };
      }

      // Check if user has permission to approve
      const userMembership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: joinRequest.groupId,
        },
      });

      if (!userMembership || userMembership.role === GroupMemberRole.MEMBER) {
        return {
          success: false,
          error: true,
          message: "You don't have permission to approve join requests",
        };
      }

      // Check if group is full
      if (joinRequest.group._count.members >= joinRequest.group.maxMembers) {
        return {
          success: false,
          error: true,
          message: "Group is full",
        };
      }

      // Check if user is already a member
      const existingMembership = await query.groupMember.findFirst({
        where: {
          userId: joinRequest.userId,
          groupId: joinRequest.groupId,
        },
      });

      if (existingMembership) {
        return {
          success: false,
          error: true,
          message: "User is already a member of this group",
        };
      }

      // Approve request and add member
      await Promise.all([
        query.groupJoinRequest.update({
          where: { id: requestId },
          data: {
            status: JoinRequestStatus.APPROVED,
            updatedAt: new Date(),
          },
        }),
        query.groupMember.create({
          data: {
            userId: joinRequest.userId,
            groupId: joinRequest.groupId,
            role: GroupMemberRole.MEMBER,
            joinedAt: new Date(),
          },
        }),
      ]);

      return {
        success: true,
        message: "Join request approved successfully",
      };
    } catch (error) {
      console.error("Error approving join request:", error);
      return {
        success: false,
        error: true,
        message: "Failed to approve join request",
      };
    }
  }

  // Reject join request
  static async rejectJoinRequest(
    user: AuthUser,
    requestId: number,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const joinRequest = await query.groupJoinRequest.findFirst({
        where: {
          id: requestId,
          status: JoinRequestStatus.PENDING,
        },
      });

      if (!joinRequest) {
        return {
          success: false,
          error: true,
          message: "Join request not found or already processed",
        };
      }

      // Check if user has permission to reject
      const userMembership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: joinRequest.groupId,
        },
      });

      if (!userMembership || userMembership.role === GroupMemberRole.MEMBER) {
        return {
          success: false,
          error: true,
          message: "You don't have permission to reject join requests",
        };
      }

      await query.groupJoinRequest.update({
        where: { id: requestId },
        data: {
          status: JoinRequestStatus.REJECTED,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Join request rejected successfully",
      };
    } catch (error) {
      console.error("Error rejecting join request:", error);
      return {
        success: false,
        error: true,
        message: "Failed to reject join request",
      };
    }
  }

  // Get join requests for a group
  static async getJoinRequests(
    user: AuthUser,
    groupId: number,
    params: { page?: number; limit?: number } = {},
  ): Promise<GroupServiceResponse<GroupJoinRequestsResponse>> {
    try {
      const { page = 1, limit = 20 } = params;
      const skip = (page - 1) * limit;

      // Check if user has permission to view join requests
      const userMembership = await query.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!userMembership || userMembership.role === GroupMemberRole.MEMBER) {
        return {
          success: false,
          error: true,
          message: "You don't have permission to view join requests",
        };
      }

      const [requests, total] = await Promise.all([
        query.groupJoinRequest.findMany({
          where: {
            groupId: groupId,
            status: JoinRequestStatus.PENDING,
          },
          include: {
            user: true,
            group: true,
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
        }),
        query.groupJoinRequest.count({
          where: {
            groupId: groupId,
            status: JoinRequestStatus.PENDING,
          },
        }),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          requests: requests as GroupJoinRequestWithUser[],
          pagination: {
            page,
            limit,
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching join requests:", error);
      return {
        success: false,
        error: true,
        message: "Failed to fetch join requests",
      };
    }
  }

  // Search groups
  static async searchGroups(
    user: AuthUser,
    params: GroupSearchParams,
  ): Promise<GroupServiceResponse<GroupListResponse>> {
    try {
      const { query: searchQuery, page = 1, limit = 20, groupType } = params;
      const skip = (page - 1) * limit;

      if (!searchQuery) {
        return {
          success: false,
          error: true,
          message: "Search query is required",
        };
      }

      let whereClause: any = {
        AND: [
          {
            OR: [
              {
                name: {
                  contains: searchQuery,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: searchQuery,
                  mode: "insensitive",
                },
              },
            ],
          },
          {
            OR: [
              {
                groupType: GroupType.PUBLIC,
              },
              {
                members: {
                  some: {
                    userId: user.id,
                  },
                },
              },
            ],
          },
        ],
      };

      if (groupType) {
        whereClause.AND.push({ groupType });
      }

      const [groups, total] = await Promise.all([
        query.groups.findMany({
          where: whereClause,
          include: {
            admin: true,
            members: {
              take: 5,
              include: {
                user: true,
              },
            },
            settings: true,
            _count: {
              select: {
                members: true,
                messages: true,
                joinRequests: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: {
            updatedAt: "desc",
          },
        }),
        query.groups.count({
          where: whereClause,
        }),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          groups: groups as GroupWithDetails[],
          pagination: {
            page,
            limit,
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error("Error searching groups:", error);
      return {
        success: false,
        error: true,
        message: "Failed to search groups",
      };
    }
  }

  // Get user's group statistics
  static async getUserGroupStats(
    user: AuthUser,
  ): Promise<GroupServiceResponse<UserGroupStats>> {
    try {
      const [
        adminGroups,
        memberGroups,
        pendingInvitations,
        pendingJoinRequests,
      ] = await Promise.all([
        query.groups.count({
          where: {
            adminId: user.id,
          },
        }),
        query.groupMember.count({
          where: {
            userId: user.id,
          },
        }),
        query.groupInvitation.count({
          where: {
            inviteeId: user.id,
            status: InvitationStatus.PENDING,
          },
        }),
        query.groupJoinRequest.count({
          where: {
            userId: user.id,
            status: JoinRequestStatus.PENDING,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          adminGroups,
          memberGroups,
          totalGroups: adminGroups + memberGroups,
          pendingInvitations,
          pendingJoinRequests,
        },
      };
    } catch (error) {
      console.error("Error fetching user group stats:", error);
      return {
        success: false,
        error: true,
        message: "Failed to fetch user group statistics",
      };
    }
  }

  // Delete group
  static async deleteGroup(
    user: AuthUser,
    groupId: number,
  ): Promise<GroupServiceResponse<any>> {
    try {
      const group = await query.groups.findFirst({
        where: {
          id: groupId,
          adminId: user.id,
        },
      });

      if (!group) {
        return {
          success: false,
          error: true,
          message: "Group not found or insufficient permissions",
        };
      }

      await query.groups.delete({
        where: { id: groupId },
      });

      return {
        success: true,
        message: "Group deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting group:", error);
      return {
        success: false,
        error: true,
        message: "Failed to delete group",
      };
    }
  }

  // Get user's invitations
  static async getUserInvitations(
    user: AuthUser,
    params: { page?: number; limit?: number } = {},
  ): Promise<GroupServiceResponse<GroupInvitationsResponse>> {
    try {
      const { page = 1, limit = 20 } = params;
      const skip = (page - 1) * limit;

      const [invitations, total] = await Promise.all([
        query.groupInvitation.findMany({
          where: {
            inviteeId: user.id,
            status: InvitationStatus.PENDING,
          },
          include: {
            inviter: true,
            invitee: true,
            group: true,
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
        }),
        query.groupInvitation.count({
          where: {
            inviteeId: user.id,
            status: InvitationStatus.PENDING,
          },
        }),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          invitations: invitations as GroupInvitationWithDetails[],
          pagination: {
            page,
            limit,
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching user invitations:", error);
      return {
        success: false,
        error: true,
        message: "Failed to fetch user invitations",
      };
    }
  }
}
