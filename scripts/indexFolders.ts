#!/usr/bin/env node

/**
 * Folder Indexing Script
 * This script indexes folder paths from a configuration file into the database.
 * It efficiently handles existing folders by comparing files between the filesystem and database.
 * 
 * Flags:
 * --config=<path>  Specify custom config file path
 * --test           Run in test mode (analysis only, no database writes)
 */

import { sqlService } from "../src/services/sqlService";
import { logService } from "../src/services/logService";
import { FileSystemService } from "../src/services/fileSystemService";
import { IndexFolderService, type FolderConfig } from "../src/services/indexFolderService";
import { ReportGenerationService } from "../src/services/reportGenerationService";
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
  const overallStartTime = performance.now();

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const configPathArg = args.find((arg) => arg.startsWith("--config="));
    const testMode = args.includes("--test");

    // Determine config file path
    const defaultConfigPath = path.join(process.cwd(), "data", "folders.json");
    const configPath = configPathArg ? configPathArg.split("=")[1] : defaultConfigPath;

    logService.info("=== Folder Indexing Script ===");
    logService.info(`Config file: ${configPath}`);
    logService.info(`Mode: ${testMode ? "TEST (Analysis Only)" : "PRODUCTION (Full Indexing)"}`);

    // Load configuration
    const config = loadFolderConfig(configPath);
    logService.info(`Loaded ${config.folders.length} folder(s) from config`);

    // Validate all folder paths exist before proceeding
    logService.info("\nValidating folder paths...");
    let hasErrors = false;
    for (const folderConfig of config.folders) {
      const absolutePath = path.resolve(folderConfig.path);
      if (!fs.existsSync(absolutePath)) {
        logService.error(`❌ Folder does not exist: "${folderConfig.name}" at path: ${absolutePath}`);
        hasErrors = true;
      } else if (!fs.statSync(absolutePath).isDirectory()) {
        logService.error(`❌ Path is not a directory: "${folderConfig.name}" at path: ${absolutePath}`);
        hasErrors = true;
      } else {
        logService.info(`✅ Folder found: "${folderConfig.name}" at ${absolutePath}`);
      }
    }

    if (hasErrors) {
      logService.error("\n❌ Configuration validation failed. Please check folder paths and try again.");
      process.exit(1);
    }

    // Connect to database
    sqlService.connect();

    // Ensure required tables exist
    sqlService.createAllTables();
    sqlService.createIndexes();

    // Initialize services
    const fileSystemService = new FileSystemService(sqlService);
    const indexFolderService = new IndexFolderService(sqlService, fileSystemService);
    const reportService = new ReportGenerationService();

    if (testMode) {
      // TEST MODE: Run analysis only, generate reports
      logService.info("\n🔍 Running analysis (no database changes)...\n");

      const analysisReport = await indexFolderService.analyzeFolders(config.folders);

      // Log summary
      logService.info("\n=== Analysis Complete ===");
      logService.info(`Total folders analyzed: ${analysisReport.totalFolders}`);
      logService.info(`Total files on disk: ${analysisReport.totalFilesOnDisk}`);
      logService.info(`Files to add: ${analysisReport.totalFilesToAdd}`);
      logService.info(`Files to skip (already in DB): ${analysisReport.totalFilesToSkip}`);
      logService.info(`Files to delete (missing from disk): ${analysisReport.totalFilesToDelete}`);
      logService.info(`Total duration: ${(analysisReport.overallTiming.totalMs / 1000).toFixed(2)}s`);

      // Generate reports
      logService.info("\n📊 Generating reports...");
      const jsonPath = reportService.generateJsonReport(analysisReport);
      const htmlPath = reportService.generateHtmlReport(analysisReport, jsonPath);

      logService.info("\n✅ Reports generated:");
      logService.info(`📄 JSON: file:///${jsonPath.replace(/\\/g, "/")}`);
      logService.info(`🌐 HTML: file:///${htmlPath.replace(/\\/g, "/")}`);
      logService.info("\nℹ️  No database changes were made (test mode)");
    } else {
      // PRODUCTION MODE: Run analysis first, then index
      logService.info("\n🔍 Running pre-indexing analysis...\n");

      const analysisReport = await indexFolderService.analyzeFolders(config.folders);

      // Log pre-indexing summary
      logService.info("\n=== Pre-Indexing Analysis ===");
      logService.info(`Total folders: ${analysisReport.totalFolders}`);
      logService.info(`Total files on disk: ${analysisReport.totalFilesOnDisk}`);
      logService.info(`Files to add: ${analysisReport.totalFilesToAdd}`);
      logService.info(`Files to skip: ${analysisReport.totalFilesToSkip}`);
      logService.info(`Files to delete: ${analysisReport.totalFilesToDelete}`);
      logService.info(`Analysis duration: ${(analysisReport.overallTiming.totalMs / 1000).toFixed(2)}s`);

      // Generate reports
      logService.info("\n📊 Generating reports...");
      const jsonPath = reportService.generateJsonReport(analysisReport);
      const htmlPath = reportService.generateHtmlReport(analysisReport, jsonPath);

      logService.info("✅ Reports generated:");
      logService.info(`📄 JSON: file:///${jsonPath.replace(/\\/g, "/")}`);
      logService.info(`🌐 HTML: file:///${htmlPath.replace(/\\/g, "/")}`);

      // Proceed with actual indexing
      logService.info("\n💾 Starting database indexing...\n");

      for (const folderConfig of config.folders) {
        await indexFolderService.indexFolder(folderConfig);
      }

      const overallDuration = (performance.now() - overallStartTime) / 1000;

      logService.info("\n=== Indexing completed successfully ===");
      logService.info(`Total duration (analysis + indexing): ${overallDuration.toFixed(2)}s`);
    }

    // Close database
    sqlService.close();
  } catch (error) {
    logService.error("Indexing failed", error as Error);
    sqlService.close();
    process.exit(1);
  }
}

// Run if executed directly (supports both Node.js and Bun)
const isDirectExecution = import.meta.main ?? (import.meta.url === `file://${process.argv[1]}`);

if (isDirectExecution) {
  main();
}

export { main };
