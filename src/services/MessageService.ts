import query from "@utils/prisma";
import { MessageSeenByReceiverProps, MessageSeenByReceiverResponse } from "types/socket";

export default class MessageService {
      // Messages seen by receiver
      static async MessagesSeenByReceiver(data: MessageSeenByReceiverProps): Promise<MessageSeenByReceiverResponse> {
            const { conversationId, lastMessageId = null } = data;
            if (!conversationId || !lastMessageId) {
                  return {
                        success: false,
                        data: null,
                        message: 'No conversation id or message id provided',
                  }
            }

            try {
                  if (lastMessageId) {
                        const updateMessages = await query.conversations.update({
                              where: {
                                    conversation_id: conversationId,
                              },
                              data: {
                                    messages: {
                                          update: {
                                                where: {
                                                      message_id: String(lastMessageId),
                                                },
                                                data: {
                                                      seen: true,
                                                }
                                          },
                                    },
                              },
                              select: {
                                    messages: {
                                          where: {
                                                message_id: String(lastMessageId),
                                          },
                                          select: {
                                                message_id: true,
                                                seen: true,
                                          },
                                          take: 1,
                                    }
                              }
                        })

                        query.$disconnect();
                        return { success: true, data: updateMessages.messages[0], message: 'Message seen successfully' };
                  } else {
                        return { success: false, message: 'No message id provided', data: null }
                  }
            } catch (error: any) {
                  return { success: false, message: error.message, data: null }
            }
      }
}
