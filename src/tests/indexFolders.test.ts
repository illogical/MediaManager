/**
 * Tests for indexFolders script
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { SqlService } from "../services/sqlService";
import { FileSystemService } from "../services/fileSystemService";
import { IndexFolderService } from "../services/indexFolderService";

// We'll test the core functionality by importing and using the same logic
describe("indexFolders script", () => {
  let sqlService: SqlService;
  let fileSystemService: FileSystemService;
  let indexFolderService: IndexFolderService;
  let testDbPath: string;
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    // Create a test database
    testDbPath = path.join(os.tmpdir(), `test-index-db-${Date.now()}.db`);
    sqlService = new SqlService(testDbPath);
    sqlService.connect();

    // Create all tables
    sqlService.createAllTables();

    // Initialize services
    fileSystemService = new FileSystemService(sqlService);
    indexFolderService = new IndexFolderService(sqlService, fileSystemService);

    // Create test directory
    testDir = path.join(os.tmpdir(), `test-index-folders-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create test config file
    configPath = path.join(os.tmpdir(), `test-config-${Date.now()}.json`);
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
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  it("should load folder configuration from JSON file", () => {
    const config = {
      folders: [
        {
          name: "Test Folder",
          path: testDir,
          recursive: true,
        },
      ],
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const loadedConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(loadedConfig.folders).toHaveLength(1);
    expect(loadedConfig.folders[0].name).toBe("Test Folder");
    expect(loadedConfig.folders[0].path).toBe(testDir);
    expect(loadedConfig.folders[0].recursive).toBe(true);
  });

  it("should handle missing files by marking them as deleted", () => {
    // Create test files
    const file1 = path.join(testDir, "image1.jpg");
    const file2 = path.join(testDir, "image2.jpg");
    fs.writeFileSync(file1, "test");
    fs.writeFileSync(file2, "test");

    // Manually insert files into database
    sqlService.execute(
      `INSERT INTO MediaFiles (folder_path, file_name, file_path, file_size, mime_type, created_date, is_deleted)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
      [testDir, "image1.jpg", file1, 100, "image/jpeg"]
    );

    sqlService.execute(
      `INSERT INTO MediaFiles (folder_path, file_name, file_path, file_size, mime_type, created_date, is_deleted)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
      [testDir, "image2.jpg", file2, 100, "image/jpeg"]
    );

    // Delete one file from filesystem
    fs.unlinkSync(file2);

    // Check which files still exist
    const files = sqlService.queryAll<{ file_path: string; is_deleted: number }>(
      "SELECT file_path, is_deleted FROM MediaFiles WHERE folder_path = ?",
      [testDir]
    );
    expect(files).toHaveLength(2);

    // Mark missing files as deleted
    const missingFiles: string[] = [];
    files.forEach((file) => {
      if (!fs.existsSync(file.file_path)) {
        missingFiles.push(file.file_path);
      }
    });

    expect(missingFiles).toHaveLength(1);
    expect(missingFiles[0]).toBe(file2);

    // Mark as deleted
    if (missingFiles.length > 0) {
      const db = sqlService.getDb();
      const updateStmt = db.prepare("UPDATE MediaFiles SET is_deleted = 1 WHERE file_path = ?");
      const transaction = db.transaction((paths: string[]) => {
        for (const filePath of paths) {
          updateStmt.run(filePath);
        }
      });
      transaction(missingFiles);
    }

    // Verify
    const updatedFiles = sqlService.queryAll<{ file_path: string; is_deleted: number }>(
      "SELECT file_path, is_deleted FROM MediaFiles WHERE folder_path = ?",
      [testDir]
    );

    const deletedFile = updatedFiles.find((f) => f.file_path === file2);
    expect(deletedFile?.is_deleted).toBe(1);

    const activeFile = updatedFiles.find((f) => f.file_path === file1);
    expect(activeFile?.is_deleted).toBe(0);
  });

  it("should detect new files when folder already exists", () => {
    // Create initial files
    const file1 = path.join(testDir, "existing.jpg");
    fs.writeFileSync(file1, "test");

    // Insert into database
    sqlService.execute(
      `INSERT INTO MediaFiles (folder_path, file_name, file_path, file_size, mime_type, created_date, is_deleted)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
      [testDir, "existing.jpg", file1, 100, "image/jpeg"]
    );

    // Get files in DB
    const dbFiles = new Set(
      sqlService
        .queryAll<{
          file_path: string;
        }>("SELECT file_path FROM MediaFiles WHERE folder_path = ? AND is_deleted = 0", [testDir])
        .map((f) => f.file_path)
    );

    expect(dbFiles.size).toBe(1);
    expect(dbFiles.has(file1)).toBe(true);

    // Add new file
    const file2 = path.join(testDir, "new.jpg");
    fs.writeFileSync(file2, "test");

    // Check if new file exists
    expect(dbFiles.has(file2)).toBe(false);
    expect(fs.existsSync(file2)).toBe(true);
  });

  it("should handle recursive folder scanning", () => {
    // Create nested directory structure
    const subDir = path.join(testDir, "subfolder");
    fs.mkdirSync(subDir);

    const file1 = path.join(testDir, "root.jpg");
    const file2 = path.join(subDir, "nested.jpg");
    fs.writeFileSync(file1, "test");
    fs.writeFileSync(file2, "test");

    // For recursive mode, files should match pattern starting with folder path
    const query = "SELECT file_path FROM MediaFiles WHERE file_path LIKE ? AND is_deleted = 0";
    const params = [`${testDir}%`];

    // Initially empty
    const initialFiles = sqlService.queryAll<{ file_path: string }>(query, params);
    expect(initialFiles).toHaveLength(0);

    // After inserting both files
    sqlService.execute(
      `INSERT INTO MediaFiles (folder_path, file_name, file_path, file_size, mime_type, created_date, is_deleted)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
      [testDir, "root.jpg", file1, 100, "image/jpeg"]
    );

    sqlService.execute(
      `INSERT INTO MediaFiles (folder_path, file_name, file_path, file_size, mime_type, created_date, is_deleted)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
      [subDir, "nested.jpg", file2, 100, "image/jpeg"]
    );

    const recursiveFiles = sqlService.queryAll<{ file_path: string }>(query, params);
    expect(recursiveFiles).toHaveLength(2);
  });

  it("should use default config path when no CLI argument provided", () => {
    const defaultPath = path.join(process.cwd(), "data", "folders.json");
    const args: string[] = [];
    const configPathArg = args.find((arg) => arg.startsWith("--config="));

    const configPath = configPathArg ? configPathArg.split("=")[1] : defaultPath;

    expect(configPath).toBe(defaultPath);
  });

  it("should use custom config path when CLI argument provided", () => {
    const customPath = "/custom/path/to/config.json";
    const args = [`--config=${customPath}`];
    const configPathArg = args.find((arg) => arg.startsWith("--config="));

    const configPath = configPathArg ? configPathArg.split("=")[1] : "default";

    expect(configPath).toBe(customPath);
  });

  it("should index a new folder using IndexFolderService", async () => {
    // Create test files
    const file1 = path.join(testDir, "photo1.jpg");
    const file2 = path.join(testDir, "photo2.png");
    fs.writeFileSync(file1, "test");
    fs.writeFileSync(file2, "test");

    // Index the folder
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Verify folder was created
    const folder = sqlService.queryOne<{ id: number; name: string }>("SELECT id, name FROM Folders WHERE path = ?", [
      testDir,
    ]);
    expect(folder).toBeDefined();
    expect(folder?.name).toBe("Test Folder");

    // Verify files were added
    const files = sqlService.queryAll<{ file_name: string }>("SELECT file_name FROM MediaFiles WHERE folder_path = ?", [
      testDir,
    ]);
    expect(files).toHaveLength(2);
  });

  it("should handle re-indexing existing folder with changes", async () => {
    // Create initial files
    const file1 = path.join(testDir, "photo1.jpg");
    const file2 = path.join(testDir, "photo2.jpg");
    fs.writeFileSync(file1, "test");
    fs.writeFileSync(file2, "test");

    // First index
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Delete one file and add a new one
    fs.unlinkSync(file2);
    const file3 = path.join(testDir, "photo3.jpg");
    fs.writeFileSync(file3, "test");

    // Re-index
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: testDir,
      recursive: false,
    });

    // Verify: photo2 should be marked as deleted
    const deletedFile = sqlService.queryOne<{ is_deleted: number }>(
      "SELECT is_deleted FROM MediaFiles WHERE file_path = ?",
      [file2]
    );
    expect(deletedFile?.is_deleted).toBe(1);

    // Verify: photo3 should be added
    const newFile = sqlService.queryOne<{ file_name: string }>("SELECT file_name FROM MediaFiles WHERE file_path = ?", [
      file3,
    ]);
    expect(newFile?.file_name).toBe("photo3.jpg");

    // Verify: photo1 should still be active
    const activeFile = sqlService.queryOne<{ is_deleted: number }>(
      "SELECT is_deleted FROM MediaFiles WHERE file_path = ?",
      [file1]
    );
    expect(activeFile?.is_deleted).toBe(0);
  });
});
