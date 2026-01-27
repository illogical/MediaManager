/**
 * File System Service for scanning and indexing media files
 */

import * as fs from "fs";
import * as path from "path";
import { SqlService } from "./sqlService";
import { logService } from "./logService";

export interface ScanResult {
  filesAdded: number;
  filesSkipped: number;
  errors: number;
}

export interface ScanOptions {
  recursive?: boolean;
}

export class FileSystemService {
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
  ];

  // Batch size for database inserts
  private readonly batchSize = 100;

  constructor(private sqlService: SqlService) {}

  /**
   * Check if a file path is hidden (starts with .)
   */
  private isHidden(filePath: string): boolean {
    const basename = path.basename(filePath);
    return basename.startsWith(".");
  }

  /**
   * Check if file extension is supported
   */
  private isSupportedExtension(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
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
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Extract file metadata
   */
  private getFileMetadata(filePath: string): {
    file_size: number | null;
    mime_type: string;
    created_date: string | null;
  } {
    try {
      const stats = fs.statSync(filePath);
      return {
        file_size: stats.size,
        mime_type: this.getMimeType(filePath),
        created_date: stats.birthtime.toISOString(),
      };
    } catch (error) {
      logService.warn(`Failed to get metadata for ${filePath}: ${(error as Error).message}`);
      return {
        file_size: null,
        mime_type: this.getMimeType(filePath),
        created_date: null,
      };
    }
  }

  /**
   * Check if file already exists in database
   */
  private fileExists(filePath: string): boolean {
    const existing = this.sqlService.queryOne<{ id: number }>("SELECT id FROM MediaFiles WHERE file_path = ?", [
      filePath,
    ]);
    return existing !== undefined;
  }

  /**
   * Scan directory for files (non-recursive)
   */
  private scanDirectory(dirPath: string, options: ScanOptions = {}): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.resolve(dirPath, entry.name);

        // Skip hidden files/folders
        if (this.isHidden(fullPath)) {
          logService.trace(`Skipping hidden: ${fullPath}`);
          continue;
        }

        if (entry.isDirectory()) {
          if (options.recursive) {
            // Recursively scan subdirectories
            logService.trace(`Scanning subdirectory: ${fullPath}`);
            const subFiles = this.scanDirectory(fullPath, options);
            files.push(...subFiles);
          } else {
            logService.warn(`Skipping folder: ${fullPath}`);
          }
        } else if (entry.isFile()) {
          if (this.isSupportedExtension(fullPath)) {
            files.push(fullPath);
          } else {
            logService.trace(`Skipping unsupported file type: ${fullPath}`);
          }
        }
      }
    } catch (error) {
      logService.error(`Failed to scan directory ${dirPath}`, error as Error);
    }

    return files;
  }

  /**
   * Insert files into database in batches
   */
  private insertFilesBatch(
    files: Array<{
      folder_path: string;
      file_name: string;
      file_path: string;
      file_size: number | null;
      mime_type: string;
      created_date: string | null;
    }>
  ): number {
    if (files.length === 0) {
      return 0;
    }

    let insertedCount = 0;

    // Process files in batches
    for (let i = 0; i < files.length; i += this.batchSize) {
      const batch = files.slice(i, Math.min(i + this.batchSize, files.length));

      try {
        // Use transaction for batch insert
        const db = this.sqlService.getDb();
        const insertStmt = db.prepare(`
          INSERT INTO MediaFiles (
            folder_path, file_name, file_path, file_size, mime_type,
            width, height, created_date, view_count, last_viewed, like_count, is_deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((items: typeof batch) => {
          for (const file of items) {
            insertStmt.run(
              file.folder_path,
              file.file_name,
              file.file_path,
              file.file_size,
              file.mime_type,
              null, // width - set to null for now
              null, // height - set to null for now
              file.created_date,
              0, // view_count
              null, // last_viewed
              0, // like_count
              0 // is_deleted
            );
          }
        });

        transaction(batch);
        insertedCount += batch.length;
        logService.info(`Inserted batch of ${batch.length} files (${insertedCount}/${files.length} total)`);
      } catch (error) {
        logService.error(`Failed to insert batch at offset ${i}`, error as Error);
      }
    }

    return insertedCount;
  }

  /**
   * Scan a directory and add media files to the database
   * @param dirPath - Absolute path to directory to scan
   * @param options - Scan options (recursive: boolean)
   * @returns ScanResult with count of files added, skipped, and errors
   */
  scan(dirPath: string, options: ScanOptions = {}): ScanResult {
    logService.info(`Starting scan of directory: ${dirPath}`);
    logService.info(`Recursive mode: ${options.recursive ?? false}`);

    const result: ScanResult = {
      filesAdded: 0,
      filesSkipped: 0,
      errors: 0,
    };

    try {
      // Validate directory exists
      if (!fs.existsSync(dirPath)) {
        logService.error(`Directory does not exist: ${dirPath}`);
        result.errors++;
        return result;
      }

      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        logService.error(`Path is not a directory: ${dirPath}`);
        result.errors++;
        return result;
      }

      // Convert to absolute path
      const absolutePath = path.resolve(dirPath);
      logService.info(`Scanning absolute path: ${absolutePath}`);

      // Scan for files
      const files = this.scanDirectory(absolutePath, options);
      logService.info(`Found ${files.length} supported files`);

      // Filter out existing files
      const filesToAdd: Array<{
        folder_path: string;
        file_name: string;
        file_path: string;
        file_size: number | null;
        mime_type: string;
        created_date: string | null;
      }> = [];

      for (const filePath of files) {
        if (this.fileExists(filePath)) {
          logService.trace(`File already exists in database: ${filePath}`);
          result.filesSkipped++;
        } else {
          const metadata = this.getFileMetadata(filePath);
          filesToAdd.push({
            folder_path: path.dirname(filePath),
            file_name: path.basename(filePath),
            file_path: filePath,
            file_size: metadata.file_size,
            mime_type: metadata.mime_type,
            created_date: metadata.created_date,
          });
        }
      }

      logService.info(`Files to add: ${filesToAdd.length}, Files skipped (already exist): ${result.filesSkipped}`);

      // Insert files in batches
      if (filesToAdd.length > 0) {
        const inserted = this.insertFilesBatch(filesToAdd);
        result.filesAdded = inserted;
        logService.info(`Successfully added ${inserted} files to database`);
      }

      logService.info(
        `Scan completed - Added: ${result.filesAdded}, Skipped: ${result.filesSkipped}, Errors: ${result.errors}`
      );
    } catch (error) {
      logService.error("Scan failed", error as Error);
      result.errors++;
    }

    return result;
  }
}
