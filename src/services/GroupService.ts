import type {AuthUser} from "../types/user";
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
    GroupServiceResponse,
    GroupListResponse,
    GroupMembersResponse,
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
import {UploadImageToS3} from "@libs/UploadImageToS3";
import {redis} from "@libs/RedisStore";

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
    ): Promise<GroupServiceResponse<any>> {
        try {
            const {page = 1, limit = 20, query: searchQuery, groupType} = params;
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
                        admin: {
                            select: {
                                user_id: true,
                                username: true,
                                profile_image: true,
                                is_verified: true,
                                role: true,
                                profile_banner: true,
                            },
                        },
                        members: {
                            where: {
                                userId: user.id,
                            },
                            include: {
                                user: true,
                            },
                        },
                        settings: true,
                        messages: {
                            take: 1,
                            orderBy: {
                                created_at: "desc",
                            },
                            include: {
                                sender: {
                                    select: {
                                        user_id: true,
                                        username: true,
                                        profile_image: true,
                                        is_verified: true,
                                    },
                                },
                            },
                        },
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
                        updated_at: "desc",
                    },
                }),
                query.groups.count({
                    where: whereClause,
                }),
            ]);
            // Transform groups data to match frontend expectations
            const transformedGroups = groups.map((group: any) => {
                const userMember = group.members.find(
                    (member: any) => member.userId === user.id,
                );
                const lastMessage = group.messages[0];

                return {
                    id: group.id,
                    name: group.name,
                    description: group.description,
                    groupIcon: group.groupIcon,
                    groupType: group.groupType,
                    maxMembers: group.maxMembers,
                    membersCount: group._count.members,
                    admin: {
                        user_id: group.admin.user_id,
                        username: group.admin.username,
                        profile_image: group.admin.profile_image,
                        is_verified: group.admin.is_verified,
                    },
                    settings: {
                        allowMemberInvites: group.settings?.allowMemberInvites || false,
                        allowMediaSharing: group.settings?.allowMediaSharing || true,
                        allowFileSharing: group.settings?.allowFileSharing || true,
                        moderateMessages: group.settings?.moderateMessages || false,
                        autoApproveJoinReqs: group.settings?.autoApproveJoinReqs || false,
                    },
                    userRole: userMember?.role || "MEMBER",
                    isActive: group.isActive,
                    lastMessage: lastMessage
                        ? {
                            content: lastMessage.content,
                            senderId: lastMessage.senderId,
                            senderUsername: lastMessage.sender.username,
                            timestamp: lastMessage.created_at,
                        }
                        : undefined,
                };
            });

            const pages = Math.ceil(total / limit);

            return {
                success: true,
                data: {
                    groups: transformedGroups,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages,
                        hasNext: page < pages,
                        hasPrev: page > 1,
                    },
                },
            } as GroupServiceResponse<any>;
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
            // First check if user is blocked from this group by checking GroupMember.isBlocked
            const membership = await query.groupMember.findFirst({
                where: {
                    userId: user.id,
                    groupId: groupId,
                },
            });

            if (membership && membership.isBlocked) {
                return {
                    success: false,
                    error: true,
                    message: "You have been blocked from this group",
                };
            }

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

    // Check if user is blocked from group
    static async checkUserBlocked(
        user: AuthUser,
        groupId: number,
    ): Promise<GroupServiceResponse<{ isBlocked: boolean }>> {
        try {
            const cacheKey = `group:${groupId}:blocked:${user.id}`;
            const cachedResult = await redis.get(cacheKey);
            if (cachedResult) {
                return {
                    success: true,
                    data: {isBlocked: JSON.parse(cachedResult)},
                }
            }
            // Check if user is blocked by checking GroupMember.isBlocked field
            const membership = await query.groupMember.findFirst({
                where: {
                    userId: user.id,
                    groupId: groupId,
                },
            });

            await redis.set(cacheKey, JSON.stringify(membership ? membership.isBlocked : false), "EX", 30);
            return {
                success: true,
                data: {
                    isBlocked: membership ? membership.isBlocked : false,
                },
            };
        } catch (error) {
            console.error("Error checking user blocked status:", error);
            return {
                success: false,
                error: true,
                message: "Failed to check blocked status",
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
                where: {id: groupId},
                data: {
                    name: data.name,
                    description: data.description,
                    groupType: data.groupType,
                    groupIcon: data.groupIcon,
                    updated_at: new Date(),
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
                where: {groupId},
                update: {
                    allowMemberInvites: data.allowMemberInvites,
                    allowMediaSharing: data.allowMediaSharing,
                    allowFileSharing: data.allowFileSharing,
                    moderateMessages: data.moderateMessages,
                    autoApproveJoinReqs: data.autoApproveJoinReqs,
                    updated_at: new Date(),
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
            // Check if user is a member and get their membership status
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

            // Check if user is blocked from this group
            if (membership.isBlocked) {
                return {
                    success: false,
                    error: true,
                    message: "You have been blocked from this group",
                };
            }

            // Check if user is muted (fixed logic)
            if (membership.isMuted) {
                // If mutedUntil is null, it's a permanent mute
                // If mutedUntil exists, check if it's still in the future
                if (!membership.mutedUntil || membership.mutedUntil > new Date()) {
                    return {
                        success: false,
                        error: true,
                        message: "You are muted in this group",
                    };
                }
            }

            const message = await query.groupMessage.create({
                data: {
                    content: data.content,
                    senderId: user.id,
                    groupId: groupId,
                    messageType: data.messageType || "text",
                    replyToId: data.replyToId,
                    deliveryStatus: "sent",
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

            // Mark as delivered for all group members except sender
            const groupMembers = await query.groupMember.findMany({
                where: {
                    groupId: groupId,
                    userId: {not: user.id},
                },
                select: {userId: true},
            });

            // Create delivery records for all members
            const deliveryRecords = groupMembers.map((member) => ({
                messageId: message.id,
                userId: member.userId.toString(),
            }));

            if (deliveryRecords.length > 0) {
                await query.groupMessageRead.createMany({
                    data: deliveryRecords,
                    skipDuplicates: true,
                });

                // Update message status to delivered
                await query.groupMessage.update({
                    where: {id: message.id},
                    data: {deliveryStatus: "delivered"},
                });
            }

            // Handle image attachments if provided
            if (data.attachments && data.attachments.length > 0) {
                for (const file of data.attachments) {
                    // Only allow images for group attachments
                    if (!file.mimetype.startsWith("image/")) {
                        continue; // Skip non-image files
                    }

                    try {
                        // Upload image to S3
                        const imageUrl = await UploadImageToS3({
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

                        await query.groupAttachment.create({
                            data: {
                                url: imageUrl,
                                type: "image",
                                fileName: file.originalname,
                                fileSize: file.size,
                                messageId: message.id,
                            },
                        });
                    } catch (error) {
                        console.error("Error uploading group attachment:", error);
                        // Continue with other attachments even if one fails
                    }
                }
            }

            // Include delivery status in response
            const messageWithStatus = {
                ...message,
                deliveryStatus: deliveryRecords.length > 0 ? "delivered" : "sent",
                deliveredToCount: deliveryRecords.length,
            };

            return {
                success: true,
                data: messageWithStatus as GroupMessageWithDetails,
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
    ): Promise<GroupServiceResponse<any>> {
        try {
            const {page = 1, limit = 100, cursor} = params;

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
                whereClause.id = {lt: cursor};
            } else {
            }

            // Fetch one extra message to determine if there are more
            const messages = await query.groupMessage.findMany({
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
                take: limit + 1,
                orderBy: {
                    created_at: "desc",
                },
            });

            // Check if there are more messages
            const hasMore = messages.length > limit;
            const actualMessages = hasMore ? messages.slice(0, limit) : messages;

            // Get next cursor (ID of the last message)
            const nextCursor =
                actualMessages.length > 0
                    ? actualMessages[actualMessages.length - 1].id
                    : null;

            // Get total count for pagination info
            const total = await query.groupMessage.count({
                where: {groupId},
            });

            const pages = Math.ceil(total / limit);

            return {
                success: true,
                data: {
                    messages: actualMessages.map((message) => ({
                        ...message,
                        attachments: message.attachments.map((attachment) => ({
                            id: attachment.id,
                            created_at: attachment.created_at,
                            type: attachment.type,
                            url: attachment.url,
                            fileSize: attachment.fileSize,
                            fileName: attachment.fileName,
                            messageId: attachment.messageId,
                            // Add client-expected fields for compatibility
                            fileUrl: attachment.url,
                            fileType: attachment.type,
                        })),
                    })) as any[],
                    nextCursor,
                    hasMore,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages,
                        hasNext: hasMore,
                        hasPrev: cursor ? true : false,
                        cursor: nextCursor,
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
    ): Promise<GroupServiceResponse<any>> {
        try {
            const group = await query.groups.findFirst({
                where: {id: groupId},
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
            // // Handle different group types
            // if (group.groupType === GroupType.PUBLIC) {
            //   // For public groups, join directly
            // } else if (group.groupType === GroupType.PRIVATE) {
            //   // For private groups, create join request
            //   const existingRequest = await query.groupJoinRequest.findFirst({
            //     where: {
            //       userId: user.id,
            //       groupId: groupId,
            //     },
            //   });

            //   if (existingRequest) {
            //     return {
            //       success: false,
            //       error: true,
            //       message: "Join request already sent",
            //     };
            //   }

            //   await query.groupJoinRequest.create({
            //     data: {
            //       userId: user.id,
            //       groupId: groupId,
            //       message: data.message,
            //       status: JoinRequestStatus.PENDING,
            //     },
            //   });

            //   return {
            //     success: true,
            //     message: "Join request sent successfully",
            //   };
            // } else {
            //   return {
            //     success: false,
            //     error: true,
            //     message: "Cannot join secret groups directly",
            //   };
            // }
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
                where: {id: groupId},
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
                where: {id: groupId},
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
                    where: {id: userId},
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

            // No max members restriction anymore

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
                    where: {id: invitationId},
                    data: {
                        status: InvitationStatus.ACCEPTED,
                        updated_at: new Date(),
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
                where: {id: invitationId},
                data: {
                    status: InvitationStatus.DECLINED,
                    updated_at: new Date(),
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
            const {cursor, limit = 20, role} = params;

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

            // Add cursor condition for pagination
            if (cursor) {
                whereClause.id = {
                    gt: cursor,
                };
            }

            const members = await query.groupMember.findMany({
                where: whereClause,
                include: {
                    user: true,
                    mutedByUser: true,
                },
                take: limit + 1, // Take one extra to check if there are more results
                orderBy: [{role: "asc"}, {joinedAt: "asc"}, {id: "asc"}],
            });

            const hasNextPage = members.length > limit;
            const resultMembers = hasNextPage ? members.slice(0, limit) : members;
            const nextCursor = hasNextPage
                ? resultMembers[resultMembers.length - 1].id
                : undefined;

            // Get total count for UI display
            const total = await query.groupMember.count({
                where: {
                    groupId: groupId,
                    ...(role && {role}),
                },
            });

            return {
                success: true,
                data: {
                    members: resultMembers as GroupMemberWithUser[],
                    pagination: {
                        cursor,
                        nextCursor,
                        hasNextPage,
                        limit,
                        total,
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
                where: {id: groupId},
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
                where: {id: memberId},
                data: {
                    role: data.role,
                    updated_at: new Date(),
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
                where: {id: groupId},
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
                where: {id: memberId},
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

            // No max members restriction anymore

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
                    where: {id: requestId},
                    data: {
                        status: JoinRequestStatus.APPROVED,
                        updated_at: new Date(),
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
                where: {id: requestId},
                data: {
                    status: JoinRequestStatus.REJECTED,
                    updated_at: new Date(),
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
            const {page = 1, limit = 20} = params;
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
                        created_at: "desc",
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
    static async MainGroup(): Promise<GroupServiceResponse<GroupListResponse>> {
        try {
            const group = await query.groups.findFirst({
                include: {
                    admin: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            fullname: true,
                            user_id: true,
                            username: true,
                            profile_image: true,
                            profile_banner: true,
                        },
                    },
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
                take: 1,
                orderBy: {
                    updated_at: "desc",
                },
            });

            if (group) {
                return {
                    success: true,
                    data: {groups: group as GroupWithDetails},
                    error: false,
                    message: "Groups Retrived Successfully",
                };
            }

            return {
                success: false,
                error: false,
                message: "No Groups Found",
            };
        } catch (error: any) {
            throw new Error(error.message);
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
                where: {id: groupId},
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
            const {page = 1, limit = 20} = params;
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
                        created_at: "desc",
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
