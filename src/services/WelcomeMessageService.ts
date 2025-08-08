import query from "@utils/prisma";

export interface WelcomeMessageConfig {
  title: string;
  content: string;
  enabled: boolean;
  delay: number; // in seconds
}

export interface SendWelcomeMessageProps {
  userId: number;
  userEmail?: string;
  username: string;
}

export default class WelcomeMessageService {
  /**
   * Get welcome message configuration from database
   */
  static async getWelcomeConfig(): Promise<WelcomeMessageConfig | null> {
    try {
      const config = await query.configurations.findFirst({
        select: {
          welcome_message_title: true,
          welcome_message_content: true,
          welcome_message_enabled: true,
          welcome_message_delay: true,
        },
      });

      if (!config) {
        return null;
      }

      return {
        title: config.welcome_message_title || "Welcome!",
        content: config.welcome_message_content || "Thank you for joining us!",
        enabled: config.welcome_message_enabled ?? true,
        delay: parseInt(config.welcome_message_delay || "300", 10),
      };
    } catch (error) {
      console.error("Error fetching welcome message config:", error);
      return null;
    }
  }

  /**
   * Send welcome message to a new user
   */
  static async sendWelcomeMessage({
    userId,
    username,
  }: SendWelcomeMessageProps): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const config = await this.getWelcomeConfig();

      if (!config || !config.enabled) {
        return {
          success: false,
          message: "Welcome messages are disabled",
        };
      }

      // Get admin user to send message from
      const adminUser = await query.user.findFirst({
        where: {
          username: "@welcome",
        },
        select: {
          user_id: true,
          username: true,
          name: true,
        },
      });

      if (!adminUser) {
        console.error("No admin user found to send welcome message");
        return {
          success: false,
          message: "No admin user available",
        };
      }

      // Get user_id for the new user
      const newUser = await query.user.findUnique({
        where: { id: userId },
        select: { user_id: true },
      });

      if (!newUser) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check if conversation already exists
      const existingParticipant = await query.participants.findFirst({
        where: {
          OR: [
            {
              AND: [{ user_1: adminUser.user_id }, { user_2: newUser.user_id }],
            },
            {
              AND: [{ user_1: newUser.user_id }, { user_2: adminUser.user_id }],
            },
          ],
        },
        include: {
          Conversations: true,
        },
      });

      let conversation;
      if (existingParticipant && existingParticipant.Conversations.length > 0) {
        conversation = existingParticipant.Conversations[0];
      } else {
        // Create new conversation
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        conversation = await query.conversations.create({
          data: {
            conversation_id: conversationId,
          },
        });

        // Create participants
        await query.participants.create({
          data: {
            user_1: adminUser.user_id,
            user_2: newUser.user_id,
            Conversations: {
              connect: { conversation_id: conversationId },
            },
          },
        });
      }

      // Create the welcome message
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await query.messages.create({
        data: {
          message_id: messageId,
          sender_id: adminUser.user_id,
          receiver_id: newUser.user_id,
          message: this.formatWelcomeMessage(config.content, username),
          isSystemMessage: true,
          conversationsId: conversation.conversation_id,
        },
      });

      return {
        success: true,
        message: "Welcome message sent successfully",
      };
    } catch (error) {
      console.error("Error sending welcome message:", error);
      return {
        success: false,
        message: "Failed to send welcome message",
      };
    }
  }

  /**
   * Schedule welcome message to be sent after a delay
   * Note: This method is now deprecated. Use WelcomeMessageJob.scheduleWelcomeMessage instead
   * Kept for backward compatibility
   */
  static async scheduleWelcomeMessage(
    props: SendWelcomeMessageProps,
  ): Promise<void> {
    console.warn(
      "WelcomeMessageService.scheduleWelcomeMessage is deprecated. Use WelcomeMessageJob.scheduleWelcomeMessage instead",
    );

    try {
      const config = await this.getWelcomeConfig();

      if (!config || !config.enabled) {
        return;
      }

      // Import the job queue dynamically to avoid circular dependencies
      const { scheduleWelcomeMessage } = await import(
        "../jobs/WelcomeMessageJob"
      );

      // Use the job queue instead of setTimeout
      await scheduleWelcomeMessage({
        userId: props.userId,
        userEmail: props.userEmail!,
        username: props.username,
      });
    } catch (error) {
      console.error("Error scheduling welcome message:", error);
    }
  }

  /**
   * Format welcome message content with user-specific data
   */
  private static formatWelcomeMessage(
    content: string,
    username: string,
  ): string {
    return content
      .replace(/\{username\}/g, username)
      .replace(/\{user\}/g, username)
      .replace(/\{name\}/g, username);
  }

  /**
   * Update welcome message configuration
   */
  static async updateWelcomeConfig(
    config: Partial<WelcomeMessageConfig>,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const existingConfig = await query.configurations.findFirst();

      if (existingConfig) {
        await query.configurations.update({
          where: { id: existingConfig.id },
          data: {
            welcome_message_title: config.title,
            welcome_message_content: config.content,
            welcome_message_enabled: config.enabled,
            welcome_message_delay: config.delay?.toString(),
          },
        });
      } else {
        await query.configurations.create({
          data: {
            welcome_message_title: config.title || "Welcome!",
            welcome_message_content:
              config.content || "Thank you for joining us!",
            welcome_message_enabled: config.enabled ?? true,
            welcome_message_delay: config.delay?.toString() || "300",
            // Add other required fields with default values
            app_name: "PayMeFans",
            app_version: "1.0.0",
            app_url: "http://localhost:3000",
            app_description: "Social platform",

            app_logo: "",
            default_currency: "USD",
            default_rate: 1.0,
            default_symbol: "$",
            point_conversion_rate: 1.0,
            point_conversion_rate_ngn: 1000.0,
            min_withdrawal_amount: 10.0,
            min_withdrawal_amount_ngn: 5000.0,
            min_deposit_amount: 5.0,
            min_deposit_amount_ngn: 1000.0,
            platform_deposit_fee: 0.1,
            platform_withdrawal_fee: 0.25,
          },
        });
      }

      return {
        success: true,
        message: "Welcome message configuration updated successfully",
      };
    } catch (error) {
      console.error("Error updating welcome message config:", error);
      return {
        success: false,
        message: "Failed to update welcome message configuration",
      };
    }
  }

  /**
   * Get welcome message statistics
   */
  static async getWelcomeMessageStats(): Promise<{
    totalSent: number;
    sentToday: number;
    sentThisWeek: number;
    sentThisMonth: number;
  }> {
    try {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalSent, sentToday, sentThisWeek, sentThisMonth] =
        await Promise.all([
          query.messages.count({
            where: {
              isSystemMessage: true,
              message: {
                contains: "Welcome",
              },
            },
          }),
          query.messages.count({
            where: {
              isSystemMessage: true,
              message: {
                contains: "Welcome",
              },
              created_at: {
                gte: todayStart,
              },
            },
          }),
          query.messages.count({
            where: {
              isSystemMessage: true,
              message: {
                contains: "Welcome",
              },
              created_at: {
                gte: weekStart,
              },
            },
          }),
          query.messages.count({
            where: {
              isSystemMessage: true,
              message: {
                contains: "Welcome",
              },
              created_at: {
                gte: monthStart,
              },
            },
          }),
        ]);

      return {
        totalSent,
        sentToday,
        sentThisWeek,
        sentThisMonth,
      };
    } catch (error) {
      console.error("Error fetching welcome message stats:", error);
      return {
        totalSent: 0,
        sentToday: 0,
        sentThisWeek: 0,
        sentThisMonth: 0,
      };
    }
  }
}
