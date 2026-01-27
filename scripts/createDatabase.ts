#!/usr/bin/env node

/**
 * Script to create the database schema
 * This script is idempotent - it can be run multiple times safely
 */

import { sqlService } from "../src/services/sqlService";
import { logService } from "../src/services/logService";

/**
 * Main function
 */
function main(): void {
  try {
    logService.info("Starting database creation...");

    // Connect to database
    sqlService.connect();

    // Create all tables using sqlService methods
    sqlService.createAllTables();

    // Create indexes
    sqlService.createIndexes();

    // Close database
    sqlService.close();

    logService.info("Database creation completed successfully");
    process.exit(0);
  } catch (error) {
    logService.error("Database creation failed", error as Error);
    sqlService.close();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
