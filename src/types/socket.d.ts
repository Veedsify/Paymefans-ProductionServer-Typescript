export type SocketUser = {
  userId: string;
  socketId: string;
  username: string;
};

export type HandleSeenProps = {
  userId: string;
  receiver_id: string;
  message_id: string;
  conversation_id: string;
  conversationId: string;
  lastMessageId: string | null;
};

export type MessageSeenByReceiverProps = {
  conversationId: string;
  lastMessageId: string | null;
};
export type MessageSeenByReceiverResponse = {
  success: boolean;
  message: string;
  data:
    | {
        message_id: string;
        seen: boolean;
      }
    | undefined;
};
export type HandleFollowUserDataProps = {
  user_id: number;
  profile_id: number;
  status: "followed" | "unfollowed" | "error";
  followId: string | null;
};

export type MessageErrorResponse = {
  message: string;
  error:
    | "INSUFFICIENT_POINTS"
    | "USERS_NOT_FOUND"
    | "TRANSACTION_ERROR"
    | "SOCKET_ERROR"
    | "UNKNOWN_ERROR";
  currentPoints?: number;
  requiredPoints?: number;
};

export type DatabaseOperationResult = {
  success: boolean;
  message?: string;
  error?: string;
  currentPoints?: number;
  requiredPoints?: number;
};
