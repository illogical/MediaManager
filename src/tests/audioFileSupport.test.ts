/**
 * Tests for Audio File Support
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { FileSystemService } from "../services/fileSystemService";
import { IndexFolderService } from "../services/indexFolderService";
import { getAudioFileMetadata } from "../services/mediaService";
import { SqlService } from "../services/sqlService";

describe("Audio File Support", () => {
  let sqlService: SqlService;
  let fileSystemService: FileSystemService;
  let indexFolderService: IndexFolderService;
  let testDbPath: string;
  let testDir: string;

  beforeEach(() => {
    // Create a test database
    testDbPath = path.join(os.tmpdir(), `test-db-${Date.now()}.db`);
    sqlService = new SqlService(testDbPath);
    sqlService.connect();

    // Create required tables
    sqlService.createMediaFilesTable();
    sqlService.createFoldersTable();

    // Create test directory with files
    testDir = path.join(os.tmpdir(), `test-audio-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    fileSystemService = new FileSystemService(sqlService);
    indexFolderService = new IndexFolderService(sqlService, fileSystemService);
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

  describe("FileSystemService - Audio File Extensions", () => {
    it("should scan and add audio files (mp3, flac, wav)", () => {
      // Create test audio files
      fs.writeFileSync(path.join(testDir, "song1.mp3"), "test audio content");
      fs.writeFileSync(path.join(testDir, "song2.flac"), "test audio content");
      fs.writeFileSync(path.join(testDir, "sound.wav"), "test audio content");

      const result = fileSystemService.scan(testDir);

      expect(result.filesAdded).toBe(3);
      expect(result.filesSkipped).toBe(0);
      expect(result.errors).toBe(0);

      // Verify files are in database
      const files = sqlService.queryAll<{ file_name: string; mime_type: string }>(
        "SELECT file_name, mime_type FROM MediaFiles"
      );
      expect(files).toHaveLength(3);
      
      const fileNames = files.map((f) => f.file_name).sort();
      expect(fileNames).toEqual(["song1.mp3", "song2.flac", "sound.wav"]);
    });

    it("should set correct MIME types for audio files", () => {
      // Create test audio files
      fs.writeFileSync(path.join(testDir, "test.mp3"), "test");
      fs.writeFileSync(path.join(testDir, "test.flac"), "test");
      fs.writeFileSync(path.join(testDir, "test.wav"), "test");

      fileSystemService.scan(testDir);

      // Verify MIME types
      const files = sqlService.queryAll<{ file_name: string; mime_type: string }>(
        "SELECT file_name, mime_type FROM MediaFiles ORDER BY file_name"
      );

      expect(files).toHaveLength(3);
      expect(files[0]).toMatchObject({ file_name: "test.flac", mime_type: "audio/flac" });
      expect(files[1]).toMatchObject({ file_name: "test.mp3", mime_type: "audio/mpeg" });
      expect(files[2]).toMatchObject({ file_name: "test.wav", mime_type: "audio/wav" });
    });

    it("should scan mixed media types including audio", () => {
      // Create test files of different types
      fs.writeFileSync(path.join(testDir, "image.jpg"), "test");
      fs.writeFileSync(path.join(testDir, "video.mp4"), "test");
      fs.writeFileSync(path.join(testDir, "audio.mp3"), "test");

      const result = fileSystemService.scan(testDir);

      expect(result.filesAdded).toBe(3);

      // Verify all files are in database with correct MIME types
      const files = sqlService.queryAll<{ file_name: string; mime_type: string }>(
        "SELECT file_name, mime_type FROM MediaFiles ORDER BY file_name"
      );

      expect(files).toHaveLength(3);
      expect(files[0]).toMatchObject({ file_name: "audio.mp3", mime_type: "audio/mpeg" });
      expect(files[1]).toMatchObject({ file_name: "image.jpg", mime_type: "image/jpeg" });
      expect(files[2]).toMatchObject({ file_name: "video.mp4", mime_type: "video/mp4" });
    });
  });

  describe("IndexFolderService - Audio File Categorization", () => {
    it("should categorize audio files correctly", async () => {
      // Create test files
      fs.writeFileSync(path.join(testDir, "image.png"), "test");
      fs.writeFileSync(path.join(testDir, "video.mp4"), "test");
      fs.writeFileSync(path.join(testDir, "audio.mp3"), "test");
      fs.writeFileSync(path.join(testDir, "music.flac"), "test");

      const analysis = await indexFolderService.analyzeFolder({
        name: "Test Folder",
        path: testDir,
        recursive: false,
      });

      expect(analysis.filesByCategory.image).toBe(1);
      expect(analysis.filesByCategory.video).toBe(1);
      expect(analysis.filesByCategory.audio).toBe(2);
      expect(analysis.totalFilesOnDisk).toBe(4);
    });

    it("should count audio file extensions correctly", async () => {
      // Create test audio files
      fs.writeFileSync(path.join(testDir, "song1.mp3"), "test");
      fs.writeFileSync(path.join(testDir, "song2.mp3"), "test");
      fs.writeFileSync(path.join(testDir, "album.flac"), "test");
      fs.writeFileSync(path.join(testDir, "sound.wav"), "test");

      const analysis = await indexFolderService.analyzeFolder({
        name: "Audio Folder",
        path: testDir,
        recursive: false,
      });

      expect(analysis.filesByExtension[".mp3"]).toBe(2);
      expect(analysis.filesByExtension[".flac"]).toBe(1);
      expect(analysis.filesByExtension[".wav"]).toBe(1);
      expect(analysis.filesByCategory.audio).toBe(4);
    });
  });

  describe("getAudioFileMetadata - Utility Function", () => {
    it("should extract metadata for mp3 file", () => {
      const filePath = path.join(testDir, "test.mp3");
      fs.writeFileSync(filePath, "test audio content");

      const metadata = getAudioFileMetadata(filePath);

      expect(metadata.exists).toBe(true);
      expect(metadata.fileName).toBe("test.mp3");
      expect(metadata.extension).toBe(".mp3");
      expect(metadata.mimeType).toBe("audio/mpeg");
      expect(metadata.fileSize).toBeGreaterThan(0);
      expect(metadata.createdDate).toBeTruthy();
      expect(metadata.modifiedDate).toBeTruthy();
    });

    it("should extract metadata for flac file", () => {
      const filePath = path.join(testDir, "test.flac");
      fs.writeFileSync(filePath, "test audio content");

      const metadata = getAudioFileMetadata(filePath);

      expect(metadata.exists).toBe(true);
      expect(metadata.fileName).toBe("test.flac");
      expect(metadata.extension).toBe(".flac");
      expect(metadata.mimeType).toBe("audio/flac");
    });

    it("should extract metadata for wav file", () => {
      const filePath = path.join(testDir, "test.wav");
      fs.writeFileSync(filePath, "test audio content");

      const metadata = getAudioFileMetadata(filePath);

      expect(metadata.exists).toBe(true);
      expect(metadata.fileName).toBe("test.wav");
      expect(metadata.extension).toBe(".wav");
      expect(metadata.mimeType).toBe("audio/wav");
    });

    it("should handle non-existent audio file", () => {
      const filePath = path.join(testDir, "nonexistent.mp3");

      const metadata = getAudioFileMetadata(filePath);

      expect(metadata.exists).toBe(false);
      expect(metadata.fileName).toBe("nonexistent.mp3");
      expect(metadata.extension).toBe(".mp3");
      expect(metadata.mimeType).toBe("audio/mpeg");
      expect(metadata.fileSize).toBe(0);
      expect(metadata.createdDate).toBeNull();
      expect(metadata.modifiedDate).toBeNull();
    });

    it("should throw error for non-audio file extension", () => {
      const filePath = path.join(testDir, "test.txt");
      fs.writeFileSync(filePath, "test");

      expect(() => getAudioFileMetadata(filePath)).toThrow(
        "File is not a supported audio format: .txt"
      );
    });

    it("should throw error for video file extension", () => {
      const filePath = path.join(testDir, "test.mp4");
      fs.writeFileSync(filePath, "test");

      expect(() => getAudioFileMetadata(filePath)).toThrow(
        "File is not a supported audio format: .mp4"
      );
    });

    it("should work with absolute and relative paths", () => {
      const fileName = "relative.mp3";
      const filePath = path.join(testDir, fileName);
      fs.writeFileSync(filePath, "test audio content");

      // Test with absolute path
      const metadata1 = getAudioFileMetadata(filePath);
      expect(metadata1.exists).toBe(true);
      expect(metadata1.fileName).toBe(fileName);

      // Test with relative path (will be resolved to absolute)
      const relativePath = path.relative(process.cwd(), filePath);
      const metadata2 = getAudioFileMetadata(relativePath);
      expect(metadata2.exists).toBe(true);
      expect(metadata2.fileName).toBe(fileName);
    });
  });

  describe("Integration - Full Audio File Support", () => {
    it("should handle complete workflow: scan, index, and retrieve metadata", async () => {
      // Create test audio files
      fs.writeFileSync(path.join(testDir, "podcast.mp3"), "podcast content");
      fs.writeFileSync(path.join(testDir, "music.flac"), "music content");
      fs.writeFileSync(path.join(testDir, "sfx.wav"), "sound effect");

      // Step 1: Analyze folder
      const analysis = await indexFolderService.analyzeFolder({
        name: "Audio Collection",
        path: testDir,
        recursive: false,
      });

      expect(analysis.filesByCategory.audio).toBe(3);
      expect(analysis.totalFilesOnDisk).toBe(3);

      // Step 2: Index folder
      await indexFolderService.indexFolder({
        name: "Audio Collection",
        path: testDir,
        recursive: false,
      });

      // Verify files are indexed
      const dbFiles = sqlService.queryAll<{ file_name: string; mime_type: string }>(
        "SELECT file_name, mime_type FROM MediaFiles ORDER BY file_name"
      );

      expect(dbFiles).toHaveLength(3);
      expect(dbFiles[0]).toMatchObject({ file_name: "music.flac", mime_type: "audio/flac" });
      expect(dbFiles[1]).toMatchObject({ file_name: "podcast.mp3", mime_type: "audio/mpeg" });
      expect(dbFiles[2]).toMatchObject({ file_name: "sfx.wav", mime_type: "audio/wav" });

      // Step 3: Get metadata for individual files (utility function)
      const metadata = getAudioFileMetadata(path.join(testDir, "podcast.mp3"));
      expect(metadata.exists).toBe(true);
      expect(metadata.mimeType).toBe("audio/mpeg");
      expect(metadata.fileSize).toBeGreaterThan(0);
    });
  });
});
