#!/usr/bin/env node

/**
 * Folder Indexing Script
 * This script indexes folder paths from a configuration file into the database.
 * It efficiently handles existing folders by comparing files between the filesystem and database.
 */

import { sqlService } from "../src/services/sqlService";
import { logService } from "../src/services/logService";
import { FileSystemService } from "../src/services/fileSystemService";
import { IndexFolderService, type FolderConfig } from "../src/services/indexFolderService";
import * as fs from "fs";
import * as path from "path";

interface FoldersConfig {
  folders: FolderConfig[];
}

/**
 * Load folder configuration from JSON file
 */
function loadFolderConfig(configPath: string): FoldersConfig {
  try {
    const configData = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configData) as FoldersConfig;

    if (!config.folders || !Array.isArray(config.folders)) {
      throw new Error("Invalid config: 'folders' array is required");
    }

    return config;
  } catch (error) {
    logService.error(`Failed to load config from ${configPath}`, error as Error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const configPathArg = args.find((arg) => arg.startsWith("--config="));

    // Determine config file path
    const defaultConfigPath = path.join(process.cwd(), "data", "folders.json");
    const configPath = configPathArg ? configPathArg.split("=")[1] : defaultConfigPath;

    logService.info("=== Folder Indexing Script ===");
    logService.info(`Config file: ${configPath}`);

    // Load configuration
    const config = loadFolderConfig(configPath);
    logService.info(`Loaded ${config.folders.length} folder(s) from config`);

    // Connect to database
    sqlService.connect();

    // Ensure required tables exist
    sqlService.createAllTables();
    sqlService.createIndexes();

    // Initialize services
    const fileSystemService = new FileSystemService(sqlService);
    const indexFolderService = new IndexFolderService(sqlService, fileSystemService);

    // Process each folder
    for (const folderConfig of config.folders) {
      await indexFolderService.indexFolder(folderConfig);
    }

    logService.info("\n=== Indexing completed successfully ===");

    // Close database
    sqlService.close();
  } catch (error) {
    logService.error("Indexing failed", error as Error);
    sqlService.close();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
