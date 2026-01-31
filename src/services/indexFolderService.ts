/**
 * Index Folder Service
 * Handles indexing of media files from configured folder paths with differential sync
 */

import { SqlService } from "./sqlService";
import { logService } from "./logService";
import { FileSystemService, FolderAlreadyExistsError } from "./fileSystemService";
import * as fs from "fs";
import * as path from "path";

export interface FolderConfig {
  name: string;
  path: string;
  recursive?: boolean;
  initialTags?: string[];
}

export interface FileAnalysis {
  filePath: string;
  fileName: string;
  folderPath: string;
  mimeType: string;
  extension: string;
  category: "image" | "video" | "audio";
  createdDate: string | null;
}

export interface TimingBreakdown {
  filesystemScanMs: number;
  databaseQueryMs: number;
  deletionMarkingMs?: number;
  totalMs: number;
}

export interface FolderAnalysisResult {
  folderName: string;
  folderPath: string;
  recursive: boolean;
  totalFilesOnDisk: number;
  filesAlreadyInDb: number;
  filesToAdd: FileAnalysis[];
  filesToDelete: string[];
  filesByCategory: {
    image: number;
    video: number;
    audio: number;
  };
  filesByExtension: Record<string, number>;
  timing: TimingBreakdown;
}

export interface AnalysisReport {
  timestamp: string;
  totalFolders: number;
  totalFilesOnDisk: number;
  totalFilesToAdd: number;
  totalFilesToSkip: number;
  totalFilesToDelete: number;
  folders: FolderAnalysisResult[];
  overallTiming: {
    totalMs: number;
    averageMsPerFolder: number;
  };
}

export class IndexFolderService {
  // Supported file extensions
  private readonly supportedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".mp4",
    ".webm",
    ".mov",
    ".avi",
    ".mkv",
    ".mp3",
    ".flac",
    ".wav",
  ];

  private readonly imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  private readonly audioExtensions = [".mp3", ".flac", ".wav"];

  constructor(
    private sqlService: SqlService,
    private fileSystemService: FileSystemService
  ) {}

  /**
   * Check if file extension is supported
   */
  private isSupportedExtension(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  /**
   * Get file category based on extension
   */
  private getFileCategory(filePath: string): "image" | "video" | "audio" {
    const ext = path.extname(filePath).toLowerCase();
    if (this.imageExtensions.includes(ext)) {
      return "image";
    }
    if (this.audioExtensions.includes(ext)) {
      return "audio";
    }
    return "video";
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
      ".mp3": "audio/mpeg",
      ".flac": "audio/flac",
      ".wav": "audio/wav",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Recursively scan directory for supported media files
   */
  private scanDirectory(dirPath: string, recursive: boolean): FileAnalysis[] {
    const files: FileAnalysis[] = [];

    const scanDir = (currentPath: string) => {
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          // Skip hidden files
          if (entry.name.startsWith(".")) {
            continue;
          }

          if (entry.isDirectory() && recursive) {
            scanDir(fullPath);
          } else if (entry.isFile() && this.isSupportedExtension(fullPath)) {
            try {
              const stats = fs.statSync(fullPath);
              const ext = path.extname(fullPath).toLowerCase();

              files.push({
                filePath: fullPath,
                fileName: entry.name,
                folderPath: currentPath,
                mimeType: this.getMimeType(fullPath),
                extension: ext,
                category: this.getFileCategory(fullPath),
                createdDate: stats.birthtime.toISOString(),
              });
            } catch (error) {
              logService.warn(`Failed to read file metadata: ${fullPath}`);
            }
          }
        }
      } catch (error) {
        logService.error(`Error scanning directory ${currentPath}:`, error as Error);
      }
    };

    scanDir(dirPath);
    return files;
  }

  /**
   * Get existing folder by path from database
   */
  private getExistingFolder(folderPath: string): { id: number; name: string; path: string } | undefined {
    return this.sqlService.queryOne<{ id: number; name: string; path: string }>(
      "SELECT id, name, path FROM Folders WHERE path = ?",
      [folderPath]
    );
  }

  /**
   * Get all files for a folder from the database
   */
  private getFilesInDatabase(folderPath: string, recursive: boolean): Set<string> {
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

    const files = this.sqlService.queryAll<{ file_path: string }>(query, params);
    return new Set(files.map((f) => f.file_path));
  }

  /**
   * Mark files as deleted in the database
   */
  private markFilesAsDeleted(filePaths: string[]): number {
    if (filePaths.length === 0) {
      return 0;
    }

    const db = this.sqlService.getDb();
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
   * Analyze a folder without making any database changes
   * Returns comprehensive analysis with file metadata, counts, and timing
   */
  async analyzeFolder(folderConfig: FolderConfig): Promise<FolderAnalysisResult> {
    const { name, path: folderPath, recursive = false } = folderConfig;
    const absolutePath = path.resolve(folderPath);

    const overallStartTime = performance.now();
    const timing: TimingBreakdown = {
      filesystemScanMs: 0,
      databaseQueryMs: 0,
      deletionMarkingMs: 0,
      totalMs: 0,
    };

    // Validate directory exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Directory does not exist: ${absolutePath}`);
    }

    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${absolutePath}`);
    }

    // Step 1: Scan filesystem
    const fsStartTime = performance.now();
    const filesOnDisk = this.scanDirectory(absolutePath, recursive);
    timing.filesystemScanMs = performance.now() - fsStartTime;

    // Step 2: Query database for existing files
    const dbStartTime = performance.now();
    const existingFolder = this.getExistingFolder(absolutePath);
    const dbFiles = existingFolder ? this.getFilesInDatabase(absolutePath, recursive) : new Set<string>();
    timing.databaseQueryMs = performance.now() - dbStartTime;

    // Step 3: Determine files to add
    const filesToAdd: FileAnalysis[] = [];
    const filesOnDiskSet = new Set<string>();

    for (const file of filesOnDisk) {
      filesOnDiskSet.add(file.filePath);
      if (!dbFiles.has(file.filePath)) {
        filesToAdd.push(file);
      }
    }

    // Step 4: Determine files to delete (in DB but not on disk)
    const filesToDelete: string[] = [];
    if (existingFolder) {
      const deletionStartTime = performance.now();

      for (const dbFilePath of dbFiles) {
        if (!filesOnDiskSet.has(dbFilePath)) {
          filesToDelete.push(dbFilePath);
        }
      }

      timing.deletionMarkingMs = performance.now() - deletionStartTime;
    }

    // Calculate statistics
    const filesByCategory = {
      image: 0,
      video: 0,
      audio: 0,
    };

    const filesByExtension: Record<string, number> = {};

    for (const file of filesToAdd) {
      filesByCategory[file.category]++;

      const ext = file.extension.toLowerCase();
      filesByExtension[ext] = (filesByExtension[ext] || 0) + 1;
    }

    timing.totalMs = performance.now() - overallStartTime;

    return {
      folderName: name,
      folderPath: absolutePath,
      recursive,
      totalFilesOnDisk: filesOnDisk.length,
      filesAlreadyInDb: dbFiles.size,
      filesToAdd,
      filesToDelete,
      filesByCategory,
      filesByExtension,
      timing,
    };
  }

  /**
   * Analyze all folders and create comprehensive report
   */
  async analyzeFolders(folderConfigs: FolderConfig[]): Promise<AnalysisReport> {
    const startTime = performance.now();
    const folders: FolderAnalysisResult[] = [];

    for (const config of folderConfigs) {
      const result = await this.analyzeFolder(config);
      folders.push(result);
    }

    const totalFilesOnDisk = folders.reduce((sum, f) => sum + f.totalFilesOnDisk, 0);
    const totalFilesToAdd = folders.reduce((sum, f) => sum + f.filesToAdd.length, 0);
    const totalFilesToSkip = folders.reduce((sum, f) => sum + f.filesAlreadyInDb, 0);
    const totalFilesToDelete = folders.reduce((sum, f) => sum + f.filesToDelete.length, 0);

    const totalMs = performance.now() - startTime;

    return {
      timestamp: new Date().toISOString(),
      totalFolders: folders.length,
      totalFilesOnDisk,
      totalFilesToAdd,
      totalFilesToSkip,
      totalFilesToDelete,
      folders,
      overallTiming: {
        totalMs,
        averageMsPerFolder: folders.length > 0 ? totalMs / folders.length : 0,
      },
    };
  }

  /**
   * Process a single folder: create/update in database and scan for files
   */
  async indexFolder(folderConfig: FolderConfig): Promise<void> {
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
    const existingFolder = this.getExistingFolder(absolutePath);

    if (existingFolder) {
      logService.info(`Folder already exists in database (ID: ${existingFolder.id})`);
      logService.info("Performing efficient file comparison...");

      // Get current files in database for this folder
      const dbFiles = this.getFilesInDatabase(absolutePath, recursive);
      logService.info(`Files in database: ${dbFiles.size}`);

      // Scan filesystem to get current files (pass initialTags for new files only)
      const scanResult = this.fileSystemService.scan(absolutePath, {
        recursive,
        initialTags: folderConfig.initialTags,
      });

      // Get files that are in database but no longer on filesystem
      const filesOnDisk = new Set<string>();
      const files = this.sqlService.queryAll<{ file_path: string }>(
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
      const missingFiles = files.map((f) => f.file_path).filter((filePath) => !filesOnDisk.has(filePath));

      if (missingFiles.length > 0) {
        const deletedCount = this.markFilesAsDeleted(missingFiles);
        logService.info(`Marked ${deletedCount} missing files as deleted`);
      } else {
        logService.info("No missing files detected");
      }

      logService.info(
        `Scan result - Added: ${scanResult.filesAdded}, ` +
          `Skipped: ${scanResult.filesSkipped}, Errors: ${scanResult.errors}`
      );
    } else {
      logService.info("Creating new folder in database...");

      try {
        const folderId = this.fileSystemService.createFolder(name, absolutePath);
        logService.info(`Folder created with ID: ${folderId}`);

        // Scan directory for files
        logService.info("Scanning directory for media files...");
        const scanResult = this.fileSystemService.scan(absolutePath, {
          recursive,
          initialTags: folderConfig.initialTags,
        });

        logService.info(
          `Scan result - Added: ${scanResult.filesAdded}, ` +
            `Skipped: ${scanResult.filesSkipped}, Errors: ${scanResult.errors}`
        );
      } catch (error) {
        if (error instanceof FolderAlreadyExistsError) {
          logService.warn("Folder was created by another process, retrying...");
          // Retry the existing folder logic
          await this.indexFolder(folderConfig);
        } else {
          throw error;
        }
      }
    }
  }
}
