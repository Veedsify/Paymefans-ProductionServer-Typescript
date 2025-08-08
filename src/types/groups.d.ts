import {
  Groups,
  GroupMember,
  GroupMessage,
  GroupAttachment,
  GroupSettings,
  GroupJoinRequest,
  GroupInvitation,
  BlockedGroupParticipant,
  User,
  GroupType,
  GroupMemberRole,
  JoinRequestStatus,
  InvitationStatus,
} from "@prisma/client";

export interface GroupWithDetails extends Groups {
  admin: User;
  members: GroupMemberWithUser[];
  settings: GroupSettings | null;
  _count: {
    members: number;
    messages: number;
    joinRequests: number;
  };
}

export interface GroupMemberWithUser extends GroupMember {
  user: User;
}

export interface GroupMessageWithDetails extends GroupMessage {
  sender: User;
  attachments: GroupAttachment[];
  replyTo?: GroupMessage | null;
  tags: Array<{
    id: number;
    user: User;
  }>;
}

export interface GroupJoinRequestWithUser extends GroupJoinRequest {
  user: User;
  group: Groups;
}

export interface GroupInvitationWithDetails extends GroupInvitation {
  inviter: User;
  invitee: User;
  group: Groups;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  groupType: GroupType;
  groupIcon?: string;
  settings?: {
    allowMemberInvites?: boolean;
    allowMediaSharing?: boolean;
    allowFileSharing?: boolean;
    moderateMessages?: boolean;
    autoApproveMembers?: boolean;
  };
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  groupType?: GroupType;
  groupIcon?: string;
}

export interface UpdateGroupSettingsRequest {
  allowMemberInvites?: boolean;
  allowMediaSharing?: boolean;
  allowFileSharing?: boolean;
  moderateMessages?: boolean;
  autoApproveJoinReqs?: boolean;
}

export interface SendGroupMessageRequest {
  content?: string;
  messageType?: string;
  replyToId?: number;
  attachments?: Express.Multer.File[];
}

export interface GroupSearchParams {
  query?: string;
  groupType?: GroupType;
  page?: number;
  limit?: number;
}

export interface GroupMemberParams {
  cursor?: number;
  limit?: number;
  role?: GroupMemberRole;
}

export interface GroupMessagesParams {
  page?: number;
  limit?: number;
  cursor?: number;
}

export interface InviteToGroupRequest {
  userIds: number[];
  message?: string;
}

export interface JoinGroupRequest {
  message?: string;
}

export interface UpdateMemberRoleRequest {
  role: GroupMemberRole;
}

export interface MuteMemberRequest {
  duration?: number; // in minutes, undefined for permanent
  reason?: string;
}

export interface BlockMemberRequest {
  reason?: string;
}

export interface GroupServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: boolean;
  errors?: string[];
}

export interface GroupListResponse {
  groups: GroupWithDetails;
}

export interface GroupMembersResponse {
  members: GroupMemberWithUser[];
  pagination: {
    cursor?: number;
    nextCursor?: number;
    hasNextPage: boolean;
    limit: number;
    total: number;
  };
}

export interface GroupMessagesResponse {
  messages: GroupMessageWithDetails[];
  nextCursor?: number | null;
  hasMore: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
    cursor?: number;
  };
}

export interface GroupJoinRequestsResponse {
  requests: GroupJoinRequestWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface GroupInvitationsResponse {
  invitations: GroupInvitationWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface GroupStats {
  totalGroups: number;
  publicGroups: number;
  privateGroups: number;
  secretGroups: number;
  totalMembers: number;
  totalMessages: number;
  activeToday: number;
}

export interface UserGroupStats {
  adminGroups: number;
  memberGroups: number;
  totalGroups: number;
  pendingInvitations: number;
  pendingJoinRequests: number;
}
