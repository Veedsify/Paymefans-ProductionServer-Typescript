import query from "@utils/prisma";

export default class ActivityService {
  // Method to get all activities of a user
  // This method retrieves all activities for a specific user
  static async GetAllActivities(userId: number): Promise<any> {
    try {
      const activities = await query.activityLog.findMany({
        where: {
          user_id: userId,
        },
        orderBy: {
          created_at: "desc",
        },
        select: {
          action: true,
          created_at: true,
        },
      });

      return activities;
    } catch (error) {
      console.error("Error fetching activities:", error);
      throw new Error("Failed to fetch activities");
    }
  }
  // method to record activity
  // This method records a new activity for a user
  static async RecordActivity(
    userId: number,
    activity: string
  ): Promise<{ error: boolean; message: string }> {
    try {
      const newActivity = await query.activityLog.create({
        data: {
          user_id: userId,
          action: activity,
        },
        select: {
          action: true,
          user: true,
        },
      });

      if (newActivity) {
        return {
          error: false,
          message: "Activity recorded successfully",
        };
      }
      return {
        error: true,
        message: "Failed to record activity",
      };
    } catch (error) {
      console.error("Error recording activity:", error);
      throw new Error("Failed to record activity");
    }
  }
  // Method to single activity
  // This method retrieves a single activity for a specific user
  static async GetSingleActivity(id: number, userId: number): Promise<any> {
    try {
      const activity = await query.activityLog.findFirst({
        where: {
          id: id,
          user_id: userId,
        },
        select: {
          action: true,
          created_at: true,
        },
      });
      return activity;
    } catch (error) {
      console.error("Error fetching activity:", error);
      throw new Error("Failed to fetch activity");
    }
  }
}
