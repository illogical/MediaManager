/**
 * Tests for Initial Tags Feature
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqlService } from "../services/sqlService";
import { IndexFolderService } from "../services/indexFolderService";
import { FileSystemService } from "../services/fileSystemService";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface Tag {
  id: number;
  name: string;
  created_at: string;
}

describe("Initial Tags Feature", () => {
  let tempDir: string;
  let sqlService: SqlService;
  let fileSystemService: FileSystemService;
  let indexFolderService: IndexFolderService;

  // Helper functions that query the test database directly
  const getAllTags = (): Tag[] => {
    return sqlService.queryAll<Tag>("SELECT * FROM Tags ORDER BY name ASC");
  };

  const getMediaTags = (mediaId: number): Tag[] => {
    return sqlService.queryAll<Tag>(
      `SELECT t.* FROM Tags t 
       JOIN MediaTags mt ON t.id = mt.tag_id 
       WHERE mt.media_id = ? 
       ORDER BY t.name ASC`,
      [mediaId]
    );
  };

  const createTag = (name: string): Tag => {
    const normalized = name.trim().toLowerCase();
    const existing = sqlService.queryOne<Tag>("SELECT * FROM Tags WHERE LOWER(name) = ?", [normalized]);
    if (existing) return existing;

    const result = sqlService.execute("INSERT INTO Tags (name) VALUES (?)", [normalized]);
    return sqlService.queryOne<Tag>("SELECT * FROM Tags WHERE id = ?", [result.lastInsertRowid])!;
  };

  const addTagToMedia = (mediaId: number, tagId: number): void => {
    sqlService.execute("INSERT OR IGNORE INTO MediaTags (media_id, tag_id) VALUES (?, ?)", [mediaId, tagId]);
  };

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-initial-tags-"));

    // Create test database
    const tempDbPath = path.join(os.tmpdir(), `test-tags-db-${Date.now()}.db`);
    sqlService = new SqlService(tempDbPath);
    sqlService.connect();
    sqlService.createAllTables();

    fileSystemService = new FileSystemService(sqlService);
    indexFolderService = new IndexFolderService(sqlService, fileSystemService);
  });

  afterEach(() => {
    // Cleanup
    if (sqlService) {
      sqlService.close();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should apply initial tags to newly added media files", async () => {
    // Create test files
    fs.writeFileSync(path.join(tempDir, "photo1.jpg"), "fake image data");
    fs.writeFileSync(path.join(tempDir, "photo2.jpg"), "fake image data");

    // Index folder with initial tags
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: tempDir,
      recursive: false,
      initialTags: ["2026", "test", "Sample Tag"],
    });

    // Verify tags were created and normalized (lowercase, trimmed)
    const tags = getAllTags();
    expect(tags).toHaveLength(3);
    expect(tags.map((t) => t.name).sort()).toEqual(["2026", "sample tag", "test"]);

    // Verify media files have the tags
    const mediaFiles = sqlService.queryAll<{ id: number; file_name: string }>(
      "SELECT id, file_name FROM MediaFiles ORDER BY file_name"
    );
    expect(mediaFiles).toHaveLength(2);

    // Check tags for each media file
    for (const media of mediaFiles) {
      const mediaTags = getMediaTags(media.id);
      expect(mediaTags).toHaveLength(3);
      expect(mediaTags.map((t) => t.name).sort()).toEqual(["2026", "sample tag", "test"]);
    }
  });

  it("should not apply initial tags if property is missing", async () => {
    // Create test files
    fs.writeFileSync(path.join(tempDir, "photo1.jpg"), "fake image data");

    // Index folder without initial tags
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: tempDir,
      recursive: false,
    });

    // Verify no tags were created
    const tags = getAllTags();
    expect(tags).toHaveLength(0);

    // Verify media file has no tags
    const mediaFiles = sqlService.queryAll<{ id: number }>("SELECT id FROM MediaFiles");
    expect(mediaFiles).toHaveLength(1);

    const mediaTags = getMediaTags(mediaFiles[0].id);
    expect(mediaTags).toHaveLength(0);
  });

  it("should not apply initial tags if array is empty", async () => {
    // Create test files
    fs.writeFileSync(path.join(tempDir, "photo1.jpg"), "fake image data");

    // Index folder with empty initial tags
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: tempDir,
      recursive: false,
      initialTags: [],
    });

    // Verify no tags were created
    const tags = getAllTags();
    expect(tags).toHaveLength(0);

    // Verify media file has no tags
    const mediaFiles = sqlService.queryAll<{ id: number }>("SELECT id FROM MediaFiles");
    expect(mediaFiles).toHaveLength(1);

    const mediaTags = getMediaTags(mediaFiles[0].id);
    expect(mediaTags).toHaveLength(0);
  });

  it("should only apply tags to NEW files, not existing ones", async () => {
    // Create initial file
    fs.writeFileSync(path.join(tempDir, "photo1.jpg"), "fake image data");

    // Index folder first time (no tags)
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: tempDir,
      recursive: false,
    });

    const mediaFiles1 = sqlService.queryAll<{ id: number; file_name: string }>(
      "SELECT id, file_name FROM MediaFiles WHERE file_name = 'photo1.jpg'"
    );
    expect(mediaFiles1).toHaveLength(1);
    const photo1Id = mediaFiles1[0].id;

    // Manually add a different tag to the existing file
    const manualTag = createTag("manual");
    addTagToMedia(photo1Id, manualTag.id);

    // Create a new file
    fs.writeFileSync(path.join(tempDir, "photo2.jpg"), "fake image data");

    // Re-index with initial tags
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: tempDir,
      recursive: false,
      initialTags: ["2026"],
    });

    // Verify photo1 still only has the manual tag (initial tags NOT applied)
    const photo1Tags = getMediaTags(photo1Id);
    expect(photo1Tags).toHaveLength(1);
    expect(photo1Tags[0].name).toBe("manual");

    // Verify photo2 has the initial tag
    const mediaFiles2 = sqlService.queryAll<{ id: number; file_name: string }>(
      "SELECT id, file_name FROM MediaFiles WHERE file_name = 'photo2.jpg'"
    );
    expect(mediaFiles2).toHaveLength(1);
    const photo2Id = mediaFiles2[0].id;

    const photo2Tags = getMediaTags(photo2Id);
    expect(photo2Tags).toHaveLength(1);
    expect(photo2Tags[0].name).toBe("2026");
  });

  it("should normalize tag names (case-insensitive, trim whitespace)", async () => {
    // Create test file
    fs.writeFileSync(path.join(tempDir, "photo1.jpg"), "fake image data");

    // Index with tags that have extra whitespace and mixed case
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: tempDir,
      recursive: false,
      initialTags: ["  Youtube  ", "WOW", "2026"],
    });

    // Verify tags were normalized
    const tags = getAllTags();
    expect(tags).toHaveLength(3);
    expect(tags.map((t) => t.name).sort()).toEqual(["2026", "wow", "youtube"]);
  });

  it("should handle duplicate tag names (idempotent)", async () => {
    // Create test file
    fs.writeFileSync(path.join(tempDir, "photo1.jpg"), "fake image data");

    // Index with duplicate tag names (different cases)
    await indexFolderService.indexFolder({
      name: "Test Folder",
      path: tempDir,
      recursive: false,
      initialTags: ["Youtube", "youtube", "YOUTUBE", "2026"],
    });

    // Verify only unique tags were created
    const tags = getAllTags();
    expect(tags).toHaveLength(2); // Only "youtube" and "2026"
    expect(tags.map((t) => t.name).sort()).toEqual(["2026", "youtube"]);

    // Verify media file has the correct tags
    const mediaFiles = sqlService.queryAll<{ id: number }>("SELECT id FROM MediaFiles");
    expect(mediaFiles).toHaveLength(1);

    const mediaTags = getMediaTags(mediaFiles[0].id);
    expect(mediaTags).toHaveLength(2);
    expect(mediaTags.map((t) => t.name).sort()).toEqual(["2026", "youtube"]);
  });
});
