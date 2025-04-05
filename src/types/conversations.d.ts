import { AuthUser } from "./user";
import { Messages, Participants, Settings } from "@prisma/client";

export type AllConversationProps = {
  user: AuthUser;
  conversationId: string;
};

export interface AllConversationResponse {
  error: boolean;
  status: boolean;
  receiver: {
    id: number;
    user_id: string;
    name: string;
    username: string;
    profile_image: string | null;
    Settings: Settings;
  } | null;
  invalid_conversation?: boolean;
  message?: string;
  messages: Messages[];
}

export interface CreateNewConversationResponse {
  error: boolean;
  status: boolean;
  message?: string;
  conversation_id: string | null;
}

export interface Conversations {
  receiver: {
    id: number;
    user_id: string;
    name: string;
    username: string;
    profile_image: string | null;
  };
  conversation_id: string;
  lastMessage: Messages;
}

export interface MyConversationResponse {
  error: boolean;
  status: boolean;
  conversations: Conversations[];
  unreadCount: number;
  hasMore: boolean;
  message?: string;
}

export interface UploadAttachmentsProps {
  conversationId: string;
  files: { "attachments[]": Express.Multer.File[] };
}

export interface UploadAttachmentsResponse {
  error: boolean;
  status: boolean;
  message?: string;
  attachments?: string[];
}

export type SearchMessagesProp = {
  q: string;
  conversationId: string;
};

export type SearchMessageResponse = {
  error: boolean;
  messages: Messages[];
};

interface GetUserConversationsReponse {
  conversations: Array<{
    conversation: {
      user_id: string;
      name: string;
      username: string;
      profile_image: string | null;
    };
    conversation_id: string;
    lastMessage: Messages;
    receiver: {
      user_id: string;
      name: string;
      username: string;
      profile_image: string | null;
    };
  }>;
  status: boolean;
}

interface SaveMessageToDBProps {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  conversationId: string;
  message: string;
  seen: boolean;
  receiver: string;
  attachment?: string[];
}
