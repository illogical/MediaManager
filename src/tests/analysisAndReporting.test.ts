/**
 * Tests for analysis and reporting functionality
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { SqlService } from "../services/sqlService";
import { FileSystemService } from "../services/fileSystemService";
import { IndexFolderService } from "../services/indexFolderService";
import { ReportGenerationService } from "../services/reportGenerationService";

describe("Analysis and Reporting", () => {
  let sqlService: SqlService;
  let fileSystemService: FileSystemService;
  let indexFolderService: IndexFolderService;
  let reportService: ReportGenerationService;
  let testDbPath: string;
  let testDir: string;
  let logsDir: string;

  beforeEach(() => {
    // Create a test database
    testDbPath = path.join(os.tmpdir(), `test-analysis-db-${Date.now()}.db`);
    sqlService = new SqlService(testDbPath);
    sqlService.connect();

    // Create all tables
    sqlService.createAllTables();

    // Initialize services
    fileSystemService = new FileSystemService(sqlService);
    indexFolderService = new IndexFolderService(sqlService, fileSystemService);

    // Create test directory
    testDir = path.join(os.tmpdir(), `test-analysis-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create logs directory
    logsDir = path.join(os.tmpdir(), `test-logs-${Date.now()}`);
    reportService = new ReportGenerationService(logsDir);
  });

  afterEach(() => {
    // Clean up
    sqlService.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(logsDir)) {
      fs.rmSync(logsDir, { recursive: true, force: true });
    }
  });

  it("should analyze a folder without making database changes", async () => {
    // Create test files
    const file1 = path.join(testDir, "photo1.jpg");
    const file2 = path.join(testDir, "photo2.png");
    const file3 = path.join(testDir, "video1.mp4");
    fs.writeFileSync(file1, "test");
    fs.writeFileSync(file2, "test");
    fs.writeFileSync(file3, "test");

    // Analyze folder
    const result = await indexFolderService.analyzeFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Verify results
    expect(result.folderName).toBe("Test Folder");
    expect(result.folderPath).toBe(testDir);
    expect(result.totalFilesOnDisk).toBe(3);
    expect(result.filesToAdd).toHaveLength(3);
    expect(result.filesAlreadyInDb).toBe(0);
    expect(result.filesToDelete).toHaveLength(0);

    // Verify category breakdown
    expect(result.filesByCategory.image).toBe(2);
    expect(result.filesByCategory.video).toBe(1);

    // Verify extension breakdown
    expect(result.filesByExtension[".jpg"]).toBe(1);
    expect(result.filesByExtension[".png"]).toBe(1);
    expect(result.filesByExtension[".mp4"]).toBe(1);

    // Verify timing data exists
    expect(result.timing.filesystemScanMs).toBeGreaterThan(0);
    expect(result.timing.databaseQueryMs).toBeGreaterThan(0);
    expect(result.timing.totalMs).toBeGreaterThan(0);

    // Verify no files were added to database
    const dbFiles = sqlService.queryAll("SELECT * FROM MediaFiles");
    expect(dbFiles).toHaveLength(0);
  });

  it("should detect files to skip when folder already exists", async () => {
    // Create test files
    const file1 = path.join(testDir, "existing.jpg");
    const file2 = path.join(testDir, "new.jpg");
    fs.writeFileSync(file1, "test");
    fs.writeFileSync(file2, "test");

    // Index first file
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Analyze folder again
    const result = await indexFolderService.analyzeFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Should detect 1 file already in DB, 1 file to add
    expect(result.totalFilesOnDisk).toBe(2);
    expect(result.filesAlreadyInDb).toBe(2); // Both files are now in DB
    expect(result.filesToAdd).toHaveLength(0); // No new files
  });

  it("should detect files to delete when missing from disk", async () => {
    // Create and index test files
    const file1 = path.join(testDir, "photo1.jpg");
    const file2 = path.join(testDir, "photo2.jpg");
    fs.writeFileSync(file1, "test");
    fs.writeFileSync(file2, "test");

    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Delete one file from disk
    fs.unlinkSync(file2);

    // Analyze folder
    const result = await indexFolderService.analyzeFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Should detect 1 file to delete
    expect(result.totalFilesOnDisk).toBe(1);
    expect(result.filesToDelete).toHaveLength(1);
    expect(result.filesToDelete[0]).toBe(file2);
  });

  it("should analyze multiple folders and create comprehensive report", async () => {
    // Create test files in first folder
    const file1 = path.join(testDir, "photo1.jpg");
    const file2 = path.join(testDir, "photo2.png");
    fs.writeFileSync(file1, "test");
    fs.writeFileSync(file2, "test");

    // Create second test directory
    const testDir2 = path.join(os.tmpdir(), `test-analysis-2-${Date.now()}`);
    fs.mkdirSync(testDir2, { recursive: true });
    const file3 = path.join(testDir2, "video1.mp4");
    fs.writeFileSync(file3, "test");

    // Analyze all folders
    const report = await indexFolderService.analyzeFolders([
      { name: "Folder 1", path: testDir, recursive: false },
      { name: "Folder 2", path: testDir2, recursive: false },
    ]);

    // Verify report structure
    expect(report.totalFolders).toBe(2);
    expect(report.totalFilesOnDisk).toBe(3);
    expect(report.totalFilesToAdd).toBe(3);
    expect(report.folders).toHaveLength(2);
    expect(report.overallTiming.totalMs).toBeGreaterThan(0);

    // Clean up
    fs.rmSync(testDir2, { recursive: true, force: true });
  });

  it("should generate JSON report", async () => {
    // Create test files
    const file1 = path.join(testDir, "photo1.jpg");
    fs.writeFileSync(file1, "test");

    // Analyze folder
    const report = await indexFolderService.analyzeFolders([
      { name: "Test Folder", path: testDir, recursive: false },
    ]);

    // Generate JSON report
    const jsonPath = reportService.generateJsonReport(report);

    // Verify file exists
    expect(fs.existsSync(jsonPath)).toBe(true);

    // Verify content
    const content = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.totalFolders).toBe(1);
    expect(parsed.totalFilesToAdd).toBe(1);
  });

  it("should generate HTML report", async () => {
    // Create test files
    const file1 = path.join(testDir, "photo1.jpg");
    fs.writeFileSync(file1, "test");

    // Analyze folder
    const report = await indexFolderService.analyzeFolders([
      { name: "Test Folder", path: testDir, recursive: false },
    ]);

    // Generate reports
    const jsonPath = reportService.generateJsonReport(report);
    const htmlPath = reportService.generateHtmlReport(report, jsonPath);

    // Verify file exists
    expect(fs.existsSync(htmlPath)).toBe(true);

    // Verify content contains expected elements
    const content = fs.readFileSync(htmlPath, "utf-8");
    expect(content).toContain("Media Manager Analysis Report");
    expect(content).toContain("Test Folder");
    expect(content).toContain("photo1.jpg");
  });

  it("should handle recursive folder scanning", async () => {
    // Create nested directory structure
    const subDir = path.join(testDir, "subfolder");
    fs.mkdirSync(subDir);

    const file1 = path.join(testDir, "root.jpg");
    const file2 = path.join(subDir, "nested.jpg");
    fs.writeFileSync(file1, "test");
    fs.writeFileSync(file2, "test");

    // Analyze with recursive option
    const result = await indexFolderService.analyzeFolder({
      name: "Test Folder",
      path: testDir,
      recursive: true,
    });

    // Should find both files
    expect(result.totalFilesOnDisk).toBe(2);
    expect(result.recursive).toBe(true);
  });

  it("should skip hidden files during analysis", async () => {
    // Create hidden and normal files
    const hiddenFile = path.join(testDir, ".hidden.jpg");
    const normalFile = path.join(testDir, "normal.jpg");
    fs.writeFileSync(hiddenFile, "test");
    fs.writeFileSync(normalFile, "test");

    // Analyze folder
    const result = await indexFolderService.analyzeFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Should only find normal file
    expect(result.totalFilesOnDisk).toBe(1);
    expect(result.filesToAdd[0].fileName).toBe("normal.jpg");
  });

  it("should include file metadata in analysis", async () => {
    // Create test file
    const file1 = path.join(testDir, "photo1.jpg");
    fs.writeFileSync(file1, "test content for size");

    // Analyze folder
    const result = await indexFolderService.analyzeFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Verify file metadata
    const fileData = result.filesToAdd[0];
    expect(fileData.fileName).toBe("photo1.jpg");
    expect(fileData.filePath).toBe(file1);
    expect(fileData.folderPath).toBe(testDir);
    expect(fileData.fileSize).toBeGreaterThan(0);
    expect(fileData.mimeType).toBe("image/jpeg");
    expect(fileData.extension).toBe(".jpg");
    expect(fileData.category).toBe("image");
    expect(fileData.createdDate).toBeTruthy();
  });
});
