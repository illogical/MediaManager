/**
 * Tests for FileSystemService
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { FileSystemService } from "../services/fileSystemService";
import { SqlService } from "../services/sqlService";

describe("FileSystemService", () => {
  let sqlService: SqlService;
  let fileSystemService: FileSystemService;
  let testDbPath: string;
  let testDir: string;

  beforeEach(() => {
    // Create a test database
    testDbPath = path.join("/tmp", `test-db-${Date.now()}.db`);
    sqlService = new SqlService(testDbPath);
    sqlService.connect();

    // Create MediaFiles table using centralized method
    sqlService.createMediaFilesTable();

    // Create test directory with files
    testDir = path.join("/tmp", `test-files-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    fileSystemService = new FileSystemService(sqlService);
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
  });

  it("should scan directory and add supported files", () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, "image1.jpg"), "test");
    fs.writeFileSync(path.join(testDir, "image2.png"), "test");
    fs.writeFileSync(path.join(testDir, "video1.mp4"), "test");
    fs.writeFileSync(path.join(testDir, "unsupported.txt"), "test");

    const result = fileSystemService.scan(testDir);

    expect(result.filesAdded).toBe(3);
    expect(result.filesSkipped).toBe(0);
    expect(result.errors).toBe(0);

    // Verify files are in database
    const files = sqlService.queryAll<{ file_name: string }>("SELECT file_name FROM MediaFiles");
    expect(files).toHaveLength(3);
    expect(files.map((f) => f.file_name).sort()).toEqual(["image1.jpg", "image2.png", "video1.mp4"]);
  });

  it("should skip hidden files", () => {
    // Create test files including hidden
    fs.writeFileSync(path.join(testDir, "visible.jpg"), "test");
    fs.writeFileSync(path.join(testDir, ".hidden.jpg"), "test");

    const result = fileSystemService.scan(testDir);

    expect(result.filesAdded).toBe(1);

    // Verify only visible file is in database
    const files = sqlService.queryAll<{ file_name: string }>("SELECT file_name FROM MediaFiles");
    expect(files).toHaveLength(1);
    expect(files[0].file_name).toBe("visible.jpg");
  });

  it("should skip existing files", () => {
    // Create test file
    const filePath = path.join(testDir, "existing.jpg");
    fs.writeFileSync(filePath, "test");

    // First scan
    const result1 = fileSystemService.scan(testDir);
    expect(result1.filesAdded).toBe(1);
    expect(result1.filesSkipped).toBe(0);

    // Second scan
    const result2 = fileSystemService.scan(testDir);
    expect(result2.filesAdded).toBe(0);
    expect(result2.filesSkipped).toBe(1);

    // Verify only one file in database
    const files = sqlService.queryAll<{ file_name: string }>("SELECT file_name FROM MediaFiles");
    expect(files).toHaveLength(1);
  });

  it("should scan recursively when option is enabled", () => {
    // Create nested directory structure
    const subDir = path.join(testDir, "subdir");
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(testDir, "root.jpg"), "test");
    fs.writeFileSync(path.join(subDir, "nested.jpg"), "test");

    // Scan without recursive
    const result1 = fileSystemService.scan(testDir, { recursive: false });
    expect(result1.filesAdded).toBe(1);

    // Clean database
    sqlService.execute("DELETE FROM MediaFiles");

    // Scan with recursive
    const result2 = fileSystemService.scan(testDir, { recursive: true });
    expect(result2.filesAdded).toBe(2);

    // Verify both files are in database
    const files = sqlService.queryAll<{ file_name: string }>("SELECT file_name FROM MediaFiles");
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.file_name).sort()).toEqual(["nested.jpg", "root.jpg"]);
  });

  it("should set width and height to null", () => {
    // Create test file
    fs.writeFileSync(path.join(testDir, "image.jpg"), "test");

    fileSystemService.scan(testDir);

    // Verify width and height are null
    const file = sqlService.queryOne<{ width: number | null; height: number | null }>(
      "SELECT width, height FROM MediaFiles WHERE file_name = ?",
      ["image.jpg"]
    );
    expect(file?.width).toBeNull();
    expect(file?.height).toBeNull();
  });

  it("should use absolute paths", () => {
    // Create test file
    fs.writeFileSync(path.join(testDir, "image.jpg"), "test");

    fileSystemService.scan(testDir);

    // Verify file_path is absolute
    const file = sqlService.queryOne<{ file_path: string }>("SELECT file_path FROM MediaFiles WHERE file_name = ?", [
      "image.jpg",
    ]);
    expect(file?.file_path).toBe(path.join(testDir, "image.jpg"));
    expect(path.isAbsolute(file?.file_path || "")).toBe(true);
  });

  it("should extract file metadata", () => {
    // Create test file
    const testContent = "test content for size";
    fs.writeFileSync(path.join(testDir, "image.jpg"), testContent);

    fileSystemService.scan(testDir);

    // Verify metadata
    const file = sqlService.queryOne<{
      file_size: number;
      mime_type: string;
      created_date: string;
    }>("SELECT file_size, mime_type, created_date FROM MediaFiles WHERE file_name = ?", ["image.jpg"]);

    expect(file?.file_size).toBe(testContent.length);
    expect(file?.mime_type).toBe("image/jpeg");
    expect(file?.created_date).toBeDefined();
  });
});
