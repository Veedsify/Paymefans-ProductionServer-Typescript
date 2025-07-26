import cron from "node-cron";
import CartService from "./CartService";

export class CronJobService {
  private static isInitialized = false;

  static initialize(): void {
    if (this.isInitialized) {
      console.log("Cron jobs already initialized");
      return;
    }

    this.setupCleanupJob();
    this.isInitialized = true;
    console.log("Cron jobs initialized successfully");
  }

  // Run cleanup every 30 minutes
  private static setupCleanupJob(): void {
    cron.schedule("*/30 * * * *", async () => {
      try {
        console.log("Running scheduled cleanup of expired checkouts...");
        await CartService.AutoCleanupExpiredCheckouts();
      } catch (error) {
        console.error("Error in scheduled cleanup:", error);
      }
    });

    console.log("Scheduled cleanup job set to run every 30 minutes");
  }

  // Manual cleanup trigger (for testing or manual runs)
  static async runCleanupNow(): Promise<void> {
    try {
      console.log("Running manual cleanup of expired checkouts...");
      await CartService.AutoCleanupExpiredCheckouts();
    } catch (error) {
      console.error("Error in manual cleanup:", error);
      throw error;
    }
  }

  // Daily cleanup at 2 AM
  static setupDailyCleanup(): void {
    cron.schedule("0 2 * * *", async () => {
      try {
        console.log("Running daily cleanup of expired checkouts...");
        await CartService.AutoCleanupExpiredCheckouts();
      } catch (error) {
        console.error("Error in daily cleanup:", error);
      }
    });

    console.log("Daily cleanup job set to run at 2:00 AM");
  }

  // Stop all cron jobs (useful for testing or graceful shutdown)
  static destroy(): void {
    cron.destroy();
    this.isInitialized = false;
    console.log("All cron jobs stopped");
  }
}
