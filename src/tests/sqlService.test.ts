/**
 * SqlService unit tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqlService } from "../services/sqlService";
import * as fs from "fs";
import * as path from "path";

describe("SqlService", () => {
  let sqlService: SqlService;
  const testDbPath = path.join(process.cwd(), "test-sqlservice.db");

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create new SqlService instance with test database
    sqlService = new SqlService(testDbPath);
    sqlService.connect();
  });

  afterEach(() => {
    // Close connection and clean up test database
    sqlService.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe("resetAllTables", () => {
    it("should delete all records from all tables", () => {
      // Create all tables
      sqlService.createAllTables();

      // Insert test data into multiple tables
      sqlService.execute("INSERT INTO Folders (name, path) VALUES (?, ?)", ["Test Folder", "/test/path"]);

      sqlService.execute("INSERT INTO Tags (name) VALUES (?)", ["Test Tag"]);

      sqlService.execute("INSERT INTO MediaFiles (folder_path, file_name, file_path) VALUES (?, ?, ?)", [
        "/test/path",
        "test.jpg",
        "/test/path/test.jpg",
      ]);

      sqlService.execute("INSERT INTO Playlists (name) VALUES (?)", ["Test Playlist"]);

      sqlService.execute("INSERT INTO Config (key, value) VALUES (?, ?)", ["test_key", "test_value"]);

      // Verify data exists
      expect(sqlService.queryAll("SELECT * FROM Folders")).toHaveLength(1);
      expect(sqlService.queryAll("SELECT * FROM Tags")).toHaveLength(1);
      expect(sqlService.queryAll("SELECT * FROM MediaFiles")).toHaveLength(1);
      expect(sqlService.queryAll("SELECT * FROM Playlists")).toHaveLength(1);
      expect(sqlService.queryAll("SELECT * FROM Config")).toHaveLength(1);

      // Reset all tables
      sqlService.resetAllTables();

      // Verify all tables are empty
      expect(sqlService.queryAll("SELECT * FROM Folders")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM Tags")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM MediaFiles")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM Playlists")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM Config")).toHaveLength(0);
    });

    it("should handle tables with foreign key relationships correctly", () => {
      // Create all tables
      sqlService.createAllTables();

      // Insert related data
      sqlService.execute("INSERT INTO Folders (name, path) VALUES (?, ?)", ["Test Folder", "/test/path"]);

      const tagResult = sqlService.execute("INSERT INTO Tags (name) VALUES (?)", ["Test Tag"]);
      const tagId = tagResult.lastInsertRowid;

      const mediaResult = sqlService.execute(
        "INSERT INTO MediaFiles (folder_path, file_name, file_path) VALUES (?, ?, ?)",
        ["/test/path", "test.jpg", "/test/path/test.jpg"]
      );
      const mediaId = mediaResult.lastInsertRowid;

      // Insert junction table records
      sqlService.execute("INSERT INTO MediaTags (media_id, tag_id) VALUES (?, ?)", [mediaId, tagId]);

      sqlService.execute("INSERT INTO ViewHistory (media_id) VALUES (?)", [mediaId]);

      const playlistResult = sqlService.execute("INSERT INTO Playlists (name) VALUES (?)", ["Test Playlist"]);
      const playlistId = playlistResult.lastInsertRowid;

      sqlService.execute("INSERT INTO PlaylistMediaOrder (playlist_id, media_id, sort_order) VALUES (?, ?, ?)", [
        playlistId,
        mediaId,
        1,
      ]);

      // Verify data exists
      expect(sqlService.queryAll("SELECT * FROM MediaTags")).toHaveLength(1);
      expect(sqlService.queryAll("SELECT * FROM ViewHistory")).toHaveLength(1);
      expect(sqlService.queryAll("SELECT * FROM PlaylistMediaOrder")).toHaveLength(1);

      // Reset all tables (should handle foreign keys correctly)
      sqlService.resetAllTables();

      // Verify all tables are empty
      expect(sqlService.queryAll("SELECT * FROM MediaTags")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM ViewHistory")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM PlaylistMediaOrder")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM MediaFiles")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM Tags")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM Playlists")).toHaveLength(0);
    });

    it("should work even if some tables are empty", () => {
      // Create all tables
      sqlService.createAllTables();

      // Insert data into only some tables
      sqlService.execute("INSERT INTO Folders (name, path) VALUES (?, ?)", ["Test Folder", "/test/path"]);

      // Verify only one table has data
      expect(sqlService.queryAll("SELECT * FROM Folders")).toHaveLength(1);
      expect(sqlService.queryAll("SELECT * FROM Tags")).toHaveLength(0);

      // Reset should still work
      sqlService.resetAllTables();

      // Verify all tables are still empty
      expect(sqlService.queryAll("SELECT * FROM Folders")).toHaveLength(0);
      expect(sqlService.queryAll("SELECT * FROM Tags")).toHaveLength(0);
    });

    it("should work when called multiple times", () => {
      // Create all tables
      sqlService.createAllTables();

      // Insert test data
      sqlService.execute("INSERT INTO Folders (name, path) VALUES (?, ?)", ["Test Folder", "/test/path"]);

      // Reset first time
      sqlService.resetAllTables();
      expect(sqlService.queryAll("SELECT * FROM Folders")).toHaveLength(0);

      // Reset second time (should not error)
      sqlService.resetAllTables();
      expect(sqlService.queryAll("SELECT * FROM Folders")).toHaveLength(0);
    });

    it("should handle RandomizationSessions table", () => {
      // Create all tables
      sqlService.createAllTables();

      // Insert randomization session
      sqlService.execute(
        "INSERT INTO RandomizationSessions (id, folder_path, filters_json, algorithm, media_order) VALUES (?, ?, ?, ?, ?)",
        ["test-session", "/test", "{}", "random", "[]"]
      );

      expect(sqlService.queryAll("SELECT * FROM RandomizationSessions")).toHaveLength(1);

      // Reset all tables
      sqlService.resetAllTables();

      expect(sqlService.queryAll("SELECT * FROM RandomizationSessions")).toHaveLength(0);
    });
  });

  describe("table operations", () => {
    it("should create all tables successfully", () => {
      sqlService.createAllTables();

      // Verify all tables exist
      expect(sqlService.tableExists("MediaFiles")).toBe(true);
      expect(sqlService.tableExists("Folders")).toBe(true);
      expect(sqlService.tableExists("Tags")).toBe(true);
      expect(sqlService.tableExists("MediaTags")).toBe(true);
      expect(sqlService.tableExists("ViewHistory")).toBe(true);
      expect(sqlService.tableExists("Playlists")).toBe(true);
      expect(sqlService.tableExists("PlaylistMediaOrder")).toBe(true);
      expect(sqlService.tableExists("RandomizationSessions")).toBe(true);
      expect(sqlService.tableExists("Config")).toBe(true);
    });
  });
});
