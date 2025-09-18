export interface BlockUserProps {
  blockedId: number;
}

export interface UnblockUserProps {
  blockedId: number;
}

export interface CheckBlockStatusProps {
  userId: number;
  targetUserId: number;
}

export interface GetBlockedUsersProps {
  query: {
    min: string;
    max: string;
  };
  user: {
    id: number;
  };
}

export interface BlockUserResponse {
  status: boolean;
  message: string;
  error: boolean;
  blockId?: string;
}

export interface UnblockUserResponse {
  status: boolean;
  message: string;
  error: boolean;
}

export interface CheckBlockStatusResponse {
  status: boolean;
  isBlocked: boolean;
  blockId?: string;
  message?: string;
  error?: boolean;
}

export interface GetBlockedUsersResponse {
  status: boolean;
  message: string;
  error: boolean;
  blockedUsers: Array<{
    user: {
      id: number;
      username: string;
      name: string;
      profile_image: string | null;
    } | null;
    blockId: string;
    created_at: Date;
  }>;
  minmax: string;
}

export interface BlockedUser {
  id: number;
  block_id: string;
  blocker_id: number;
  blocked_id: number;
  created_at: Date;
  updated_at: Date;
}
