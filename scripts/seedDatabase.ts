#!/usr/bin/env node

/**
 * Script to seed the database with sample data
 * This script is idempotent - it can be run multiple times safely
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sqlService } from "../src/services/sqlService";
import { logService } from "../src/services/logService";
import { SeedDatabaseService, SeedData } from "../src/services/seedDatabaseService";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load seed data from JSON file
 */
function loadSeedData(filePath: string): SeedData {
  try {
    const absolutePath = resolve(filePath);
    logService.info(`Loading seed data from: ${absolutePath}`);
    const fileContent = readFileSync(absolutePath, "utf-8");
    const data = JSON.parse(fileContent) as SeedData;
    logService.info("Seed data loaded successfully");
    return data;
  } catch (error) {
    logService.error("Failed to load seed data", error as Error);
    throw error;
  }
}

/**
 * Main function
 */
function main(): void {
  try {
    logService.info("Starting database seeding...");

    // Connect to database
    sqlService.connect();

    // Check if database exists
    if (!sqlService.databaseExists()) {
      throw new Error("Database does not exist or has no tables. Run createDatabase script first.");
    }

    // Load seed data
    const seedDataPath = process.argv[2] || resolve(__dirname, "seedData.json");
    const seedData = loadSeedData(seedDataPath);

    // Create seeding service and seed data
    const seedService = new SeedDatabaseService(sqlService);
    seedService.seed(seedData);

    // Close database
    sqlService.close();

    logService.info("Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    logService.error("Database seeding failed", error as Error);
    sqlService.close();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
