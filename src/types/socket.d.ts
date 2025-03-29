export type SocketUser = {
      userId: string;
      username: string;
}

export type HandleSeenProps = {
      userId: string;
      receiver_id: string;
      message_id: string;
      conversation_id: string;
      conversationId: string;
      lastMessageId: string | null;
}

export type MessageSeenByReceiverProps = {
      conversationId: string;
      lastMessageId: string | null;
}
export type MessageSeenByReceiverResponse = {
      success: boolean;
      message: string;
      data: {
            message_id: string;
            seen: boolean;
      } | null;
}
export type HandleFollowUserDataProps = {
      user_id: number; 
      profile_id: number;
      status: "followed" | "unfollowed" | "error";
      followId: string | null;
}
