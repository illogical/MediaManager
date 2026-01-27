#!/usr/bin/env node

/**
 * Demo script for FileSystemService
 * This script demonstrates scanning a directory and adding files to the database
 */

import { sqlService } from "../src/services/sqlService";
import { logService } from "../src/services/logService";
import { FileSystemService } from "../src/services/fileSystemService";
import * as fs from "fs";
import * as path from "path";

async function main() {
  try {
    logService.info("=== FileSystemService Demo ===");

    // Create a temporary test directory
    const demoDir = path.join("/tmp", `demo-scan-${Date.now()}`);
    fs.mkdirSync(demoDir, { recursive: true });
    logService.info(`Created demo directory: ${demoDir}`);

    // Create some test files
    const testFiles = [
      { name: "photo1.jpg", content: "This is a JPEG photo" },
      { name: "photo2.png", content: "This is a PNG image" },
      { name: "video.mp4", content: "This is a video file" },
      { name: ".hidden.jpg", content: "This is a hidden file" },
      { name: "document.txt", content: "This is not a media file" },
    ];

    // Create subdirectory for recursive testing
    const subDir = path.join(demoDir, "subfolder");
    fs.mkdirSync(subDir);

    testFiles.forEach((file) => {
      fs.writeFileSync(path.join(demoDir, file.name), file.content);
    });

    // Add a file in subdirectory
    fs.writeFileSync(path.join(subDir, "nested-photo.jpg"), "Nested image");

    logService.info(`Created ${testFiles.length} test files and 1 nested file`);

    // Connect to database
    sqlService.connect();

    // Create MediaFiles table if it doesn't exist using centralized method
    sqlService.createMediaFilesTable();

    // Initialize FileSystemService
    const fileSystemService = new FileSystemService(sqlService);

    // Demo 1: Non-recursive scan
    logService.info("\n=== Demo 1: Non-recursive scan ===");
    const result1 = fileSystemService.scan(demoDir, { recursive: false });
    logService.info(`Result: Added=${result1.filesAdded}, Skipped=${result1.filesSkipped}, Errors=${result1.errors}`);

    // Show files in database
    const files1 = sqlService.queryAll<{ file_name: string; file_path: string; mime_type: string }>(
      "SELECT file_name, file_path, mime_type FROM MediaFiles"
    );
    logService.info(`Files in database after non-recursive scan: ${files1.length}`);
    files1.forEach((file) => {
      logService.info(`  - ${file.file_name} (${file.mime_type})`);
    });

    // Demo 2: Re-scan same directory (should skip existing)
    logService.info("\n=== Demo 2: Re-scan same directory (should skip existing) ===");
    const result2 = fileSystemService.scan(demoDir, { recursive: false });
    logService.info(`Result: Added=${result2.filesAdded}, Skipped=${result2.filesSkipped}, Errors=${result2.errors}`);

    // Demo 3: Recursive scan
    logService.info("\n=== Demo 3: Recursive scan ===");
    const result3 = fileSystemService.scan(demoDir, { recursive: true });
    logService.info(`Result: Added=${result3.filesAdded}, Skipped=${result3.filesSkipped}, Errors=${result3.errors}`);

    // Show all files in database
    const files3 = sqlService.queryAll<{ file_name: string; file_path: string; mime_type: string; file_size: number }>(
      "SELECT file_name, file_path, mime_type, file_size FROM MediaFiles ORDER BY file_name"
    );
    logService.info(`\nTotal files in database after recursive scan: ${files3.length}`);
    files3.forEach((file) => {
      logService.info(`  - ${file.file_name} (${file.mime_type}, ${file.file_size} bytes)`);
    });

    // Demo 4: Verify width and height are null
    logService.info("\n=== Demo 4: Verify width and height are null ===");
    const fileWithDimensions = sqlService.queryOne<{ file_name: string; width: number | null; height: number | null }>(
      "SELECT file_name, width, height FROM MediaFiles LIMIT 1"
    );
    if (fileWithDimensions) {
      logService.info(
        `File: ${fileWithDimensions.file_name}, width=${fileWithDimensions.width}, height=${fileWithDimensions.height}`
      );
    }

    // Clean up
    logService.info("\n=== Cleanup ===");

    // Clear MediaFiles table but keep the schema
    sqlService.execute("DELETE FROM MediaFiles");
    logService.info("Cleared MediaFiles table");

    // Close database
    sqlService.close();

    // Remove demo directory
    fs.rmSync(demoDir, { recursive: true, force: true });
    logService.info(`Removed demo directory: ${demoDir}`);

    logService.info("\n=== Demo completed successfully ===");
  } catch (error) {
    logService.error("Demo failed", error as Error);
    sqlService.close();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
