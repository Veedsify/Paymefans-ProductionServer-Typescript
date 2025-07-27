import query from "@utils/prisma";
import { GenerateUniqueId } from "../utils/GenerateUniqueId";
import type { MentionJobData, MentionUser } from "../types/notifications";

type MentionData = MentionJobData;

export class MentionService {
  static async processMentions(data: MentionData): Promise<void> {
    const { mentions, mentioner, type, contentId, content } = data;

    if (!mentions || mentions.length === 0) {
      return;
    }

    try {
      // Validate mentions to ensure no blocking relationships exist
      const validatedMentions = await this.validateMentions(
        mentions,
        mentioner.id,
      );

      // Filter out the mentioner from mentions (don't notify yourself)
      const validMentions = validatedMentions.filter(
        (mention) => mention.id !== mentioner.id,
      );

      if (validMentions.length === 0) {
        return;
      }

      // Create notifications for each mentioned user
      const notificationPromises = validMentions.map(async (mention) => {
        const notificationId = `NOT${GenerateUniqueId()}`;

        let message: string;
        let url: string;

        if (type === "post") {
          message = `<strong>${mentioner.username}</strong> mentioned you in a post`;
          url = `${process.env.APP_URL}/posts/${contentId}`;
        } else {
          message = `<strong>${mentioner.username}</strong> mentioned you in a comment`;
          url = `${process.env.APP_URL}/posts/${contentId}#comment`;
        }

        return query.notifications.create({
          data: {
            notification_id: notificationId,
            message,
            user_id: mention.id,
            action: "sparkle",
            url,
          },
        });
      });

      await Promise.all(notificationPromises);

      console.log(
        `Created ${validMentions.length} mention notifications for ${type} ${contentId}`,
      );
    } catch (error) {
      console.error("Error processing mentions:", error);
      throw error;
    }
  }

  /**
   * Extract mentions from content and validate them
   */
  static async validateMentions(
    mentions: MentionUser[],
    mentionerId: number,
  ): Promise<MentionUser[]> {
    if (!mentions || mentions.length === 0) {
      return [];
    }

    try {
      // Get user IDs to validate
      const userIds = mentions.map((mention) => mention.id);

      // Get blocking relationships
      const [blockedByUsers, userBlockedUsers] = await Promise.all([
        (query as any).userBlock.findMany({
          where: {
            blocked_id: mentionerId,
            blocker_id: { in: userIds },
          },
          select: {
            blocker_id: true,
          },
        }),
        (query as any).userBlock.findMany({
          where: {
            blocker_id: mentionerId,
            blocked_id: { in: userIds },
          },
          select: {
            blocked_id: true,
          },
        }),
      ]);

      const blockedByUserIds = blockedByUsers.map(
        (block: any) => block.blocker_id,
      );
      const userBlockedIds = userBlockedUsers.map(
        (block: any) => block.blocked_id,
      );
      const allBlockedUserIds = [...blockedByUserIds, ...userBlockedIds];

      // Validate that all mentioned users exist, are active, and not blocked
      const validUsers = await query.user.findMany({
        where: {
          id: { in: userIds },
          active_status: true,
          NOT: {
            id: { in: allBlockedUserIds },
          },
        },
        select: {
          id: true,
          username: true,
          name: true,
        },
      });

      // Return only valid mentions
      return validUsers.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name || user.username,
      }));
    } catch (error) {
      console.error("Error validating mentions:", error);
      return [];
    }
  }
}
