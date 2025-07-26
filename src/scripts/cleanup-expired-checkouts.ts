#!/usr/bin/env node
import "module-alias/register";
import { CronJobService } from "@services/CronJobService";
import { connectDB } from "@utils/mongodb";
import query from "@utils/prisma";

async function main() {
  try {
    console.log("🧹 Starting cleanup of expired checkouts...");

    // Connect to database
    await connectDB();

    // Run the cleanup
    await CronJobService.runCleanupNow();

    // Get count of remaining pending checkouts
    const remainingCount = await query.pendingCheckout.count();

    console.log(`✅ Cleanup completed!`);
    console.log(`📊 Remaining pending checkouts: ${remainingCount}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Handle script arguments
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Cleanup Expired Checkouts Script

Usage: npm run cleanup-checkouts

This script will:
- Remove all expired pending checkouts from the database
- Display statistics about the cleanup operation

Options:
  --help, -h    Show this help message

Example:
  npm run cleanup-checkouts
  bun run cleanup-checkouts
  `);
  process.exit(0);
}

// Run the main function
main();
