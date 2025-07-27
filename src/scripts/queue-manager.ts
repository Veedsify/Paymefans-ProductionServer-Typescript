#!/usr/bin/env node
import "module-alias/register";
import { CronJobService } from "@services/CronJobService";
import { connectDB } from "@utils/mongodb";

async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === "--help" || command === "-h") {
      showHelp();
      process.exit(0);
    }

    // Connect to database first
    await connectDB();

    // Initialize the CronJobService to access queue methods
    CronJobService.initialize();

    switch (command) {
      case "stats":
        await showQueueStats();
        break;
      case "pause":
        await pauseQueue();
        break;
      case "resume":
        await resumeQueue();
        break;
      case "clean":
        await cleanQueue();
        break;
      case "run-cleanup":
        await runManualCleanup();
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

    // Cleanup and exit
    await CronJobService.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🔧 BullMQ Queue Manager

Usage: tsx src/scripts/queue-manager.ts <command>

Commands:
  stats         Show queue statistics
  pause         Pause the cleanup queue
  resume        Resume the cleanup queue
  clean         Clean old completed and failed jobs
  run-cleanup   Manually run a cleanup job
  --help, -h    Show this help message

Examples:
  tsx src/scripts/queue-manager.ts stats
  tsx src/scripts/queue-manager.ts pause
  tsx src/scripts/queue-manager.ts resume
  tsx src/scripts/queue-manager.ts clean
  tsx src/scripts/queue-manager.ts run-cleanup
  `);
}

async function showQueueStats() {
  console.log("📊 Fetching queue statistics...");

  const stats = await CronJobService.getQueueStats();

  if (stats) {
    console.log("\n📈 Queue Statistics:");
    console.log(`  Waiting jobs: ${stats.waiting}`);
    console.log(`  Active jobs: ${stats.active}`);
    console.log(`  Completed jobs: ${stats.completed}`);
    console.log(`  Failed jobs: ${stats.failed}`);
    console.log(`  Delayed jobs: ${stats.delayed}`);
    console.log(`  Repeatable jobs: ${stats.repeatableJobs}`);
  } else {
    console.error("❌ Could not fetch queue statistics");
  }
}

async function pauseQueue() {
  console.log("⏸️  Pausing cleanup queue...");
  await CronJobService.pauseQueue();
  console.log("✅ Queue paused successfully");
}

async function resumeQueue() {
  console.log("▶️  Resuming cleanup queue...");
  await CronJobService.resumeQueue();
  console.log("✅ Queue resumed successfully");
}

async function cleanQueue() {
  console.log("🧹 Cleaning old jobs from queue...");
  await CronJobService.cleanQueue();
  console.log("✅ Queue cleaned successfully");
}

async function runManualCleanup() {
  console.log("🚀 Running manual cleanup job...");
  await CronJobService.runCleanupNow();
  console.log("✅ Manual cleanup completed successfully");
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
main();
