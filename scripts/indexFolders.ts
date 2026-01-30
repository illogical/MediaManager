#!/usr/bin/env node

/**
 * Folder Indexing Script
 * This script indexes folder paths from a configuration file into the database.
 * It efficiently handles existing folders by comparing files between the filesystem and database.
 */

import { sqlService } from "../src/services/sqlService";
import { logService } from "../src/services/logService";
import { FileSystemService, FolderAlreadyExistsError } from "../src/services/fileSystemService";
import * as fs from "fs";
import * as path from "path";

interface FolderConfig {
  name: string;
  path: string;
  recursive?: boolean;
}

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
 * Get existing folder by path from database
 */
function getExistingFolder(folderPath: string): { id: number; name: string; path: string } | undefined {
  return sqlService.queryOne<{ id: number; name: string; path: string }>(
    "SELECT id, name, path FROM Folders WHERE path = ?",
    [folderPath]
  );
}

/**
 * Get all files for a folder from the database
 */
function getFilesInDatabase(folderPath: string, recursive: boolean): Set<string> {
  let query: string;
  const params: string[] = [];
  
  if (recursive) {
    // For recursive mode, get files that start with the folder path
    query = "SELECT file_path FROM MediaFiles WHERE file_path LIKE ? AND is_deleted = 0";
    params.push(`${folderPath}%`);
  } else {
    // For non-recursive mode, get files where folder_path exactly matches
    query = "SELECT file_path FROM MediaFiles WHERE folder_path = ? AND is_deleted = 0";
    params.push(folderPath);
  }
  
  const files = sqlService.queryAll<{ file_path: string }>(query, params);
  return new Set(files.map((f) => f.file_path));
}

/**
 * Mark files as deleted in the database
 */
function markFilesAsDeleted(filePaths: string[]): number {
  if (filePaths.length === 0) {
    return 0;
  }
  
  const db = sqlService.getDb();
  const updateStmt = db.prepare("UPDATE MediaFiles SET is_deleted = 1 WHERE file_path = ?");
  
  const transaction = db.transaction((paths: string[]) => {
    for (const filePath of paths) {
      updateStmt.run(filePath);
    }
  });
  
  transaction(filePaths);
  return filePaths.length;
}

/**
 * Process a single folder: create/update in database and scan for files
 */
async function processFolder(
  fileSystemService: FileSystemService,
  folderConfig: FolderConfig
): Promise<void> {
  const { name, path: folderPath, recursive = false } = folderConfig;
  const absolutePath = path.resolve(folderPath);
  
  logService.info(`\n=== Processing folder: ${name} ===`);
  logService.info(`Path: ${absolutePath}`);
  logService.info(`Recursive: ${recursive}`);
  
  // Validate directory exists
  if (!fs.existsSync(absolutePath)) {
    logService.error(`Directory does not exist: ${absolutePath}`);
    return;
  }
  
  const stats = fs.statSync(absolutePath);
  if (!stats.isDirectory()) {
    logService.error(`Path is not a directory: ${absolutePath}`);
    return;
  }
  
  // Check if folder already exists in database
  const existingFolder = getExistingFolder(absolutePath);
  
  if (existingFolder) {
    logService.info(`Folder already exists in database (ID: ${existingFolder.id})`);
    logService.info("Performing efficient file comparison...");
    
    // Get current files in database for this folder
    const dbFiles = getFilesInDatabase(absolutePath, recursive);
    logService.info(`Files in database: ${dbFiles.size}`);
    
    // Scan filesystem to get current files
    const scanResult = fileSystemService.scan(absolutePath, { recursive });
    
    // Get files that are in database but no longer on filesystem
    const filesOnDisk = new Set<string>();
    const files = sqlService.queryAll<{ file_path: string }>(
      recursive
        ? "SELECT file_path FROM MediaFiles WHERE file_path LIKE ? AND is_deleted = 0"
        : "SELECT file_path FROM MediaFiles WHERE folder_path = ? AND is_deleted = 0",
      [recursive ? `${absolutePath}%` : absolutePath]
    );
    
    // Check which files still exist on disk
    files.forEach((file) => {
      if (fs.existsSync(file.file_path)) {
        filesOnDisk.add(file.file_path);
      }
    });
    
    // Mark missing files as deleted
    const missingFiles = files
      .map((f) => f.file_path)
      .filter((filePath) => !filesOnDisk.has(filePath));
    
    if (missingFiles.length > 0) {
      const deletedCount = markFilesAsDeleted(missingFiles);
      logService.info(`Marked ${deletedCount} missing files as deleted`);
    } else {
      logService.info("No missing files detected");
    }
    
    logService.info(
      `Scan result - Added: ${scanResult.filesAdded}, Skipped: ${scanResult.filesSkipped}, Errors: ${scanResult.errors}`
    );
  } else {
    logService.info("Creating new folder in database...");
    
    try {
      const folderId = fileSystemService.createFolder(name, absolutePath);
      logService.info(`Folder created with ID: ${folderId}`);
      
      // Scan directory for files
      logService.info("Scanning directory for media files...");
      const scanResult = fileSystemService.scan(absolutePath, { recursive });
      
      logService.info(
        `Scan result - Added: ${scanResult.filesAdded}, Skipped: ${scanResult.filesSkipped}, Errors: ${scanResult.errors}`
      );
    } catch (error) {
      if (error instanceof FolderAlreadyExistsError) {
        logService.warn("Folder was created by another process, retrying...");
        // Retry the existing folder logic
        await processFolder(fileSystemService, folderConfig);
      } else {
        throw error;
      }
    }
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
    const configPath = configPathArg
      ? configPathArg.split("=")[1]
      : defaultConfigPath;
    
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
    
    // Initialize FileSystemService
    const fileSystemService = new FileSystemService(sqlService);
    
    // Process each folder
    for (const folderConfig of config.folders) {
      await processFolder(fileSystemService, folderConfig);
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
