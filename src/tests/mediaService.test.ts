/**
 * MediaService unit tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MediaService } from "../services/mediaService";
import { sqlService } from "../services/sqlService";
import type { MediaFile, Tag } from "../api/schemas";

// Mock the sqlService
vi.mock("../services/sqlService", () => {
  return {
    sqlService: {
      queryAll: vi.fn(),
      queryOne: vi.fn(),
      execute: vi.fn(),
    },
    SqlService: vi.fn(),
  };
});

// Mock the logService
vi.mock("../services/logService", () => {
  return {
    logService: {
      trace: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe("MediaService", () => {
  let mediaService: MediaService;
  const mockSqlService = vi.mocked(sqlService);

  beforeEach(() => {
    mediaService = new MediaService();
    vi.clearAllMocks();
  });

  describe("getMediaFiles", () => {
    it("should return media files with tags", () => {
      const mockMediaFiles: MediaFile[] = [
        {
          id: 1,
          folder_path: "/test",
          file_name: "test.jpg",
          file_path: "/test/test.jpg",
          file_size: 1024,
          mime_type: "image/jpeg",
          width: 800,
          height: 600,
          created_date: "2024-01-01",
          view_count: 5,
          last_viewed: null,
          like_count: 3,
          is_deleted: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockTags: Tag[] = [{ id: 1, name: "nature", created_at: "2024-01-01T00:00:00Z" }];

      mockSqlService.queryAll.mockReturnValueOnce(mockMediaFiles).mockReturnValueOnce(mockTags);

      const result = mediaService.getMediaFiles({
        sort: "created_date_desc",
        limit: 30,
        offset: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].tags).toEqual(mockTags);
    });

    it("should return empty array when no media files found", () => {
      mockSqlService.queryAll.mockReturnValue([]);

      const result = mediaService.getMediaFiles({
        sort: "created_date_desc",
        limit: 30,
        offset: 0,
      });

      expect(result).toHaveLength(0);
    });

    it("should throw on database errors", () => {
      mockSqlService.queryAll.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() =>
        mediaService.getMediaFiles({
          sort: "created_date_desc",
          limit: 30,
          offset: 0,
        })
      ).toThrow("Database error");
    });
  });

  describe("getMediaFileById", () => {
    it("should return media file with tags when found", () => {
      const mockMedia: MediaFile = {
        id: 1,
        folder_path: "/test",
        file_name: "test.jpg",
        file_path: "/test/test.jpg",
        file_size: 1024,
        mime_type: "image/jpeg",
        width: 800,
        height: 600,
        created_date: "2024-01-01",
        view_count: 5,
        last_viewed: null,
        like_count: 3,
        is_deleted: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockTags: Tag[] = [{ id: 1, name: "nature", created_at: "2024-01-01T00:00:00Z" }];

      mockSqlService.queryOne.mockReturnValue(mockMedia);
      mockSqlService.queryAll.mockReturnValue(mockTags);

      const result = mediaService.getMediaFileById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.tags).toEqual(mockTags);
    });

    it("should return null when media file not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      const result = mediaService.getMediaFileById(999);

      expect(result).toBeNull();
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => mediaService.getMediaFileById(1)).toThrow("Database error");
    });
  });

  describe("incrementViewCount", () => {
    it("should increment view count and return new count", () => {
      const mockMedia: MediaFile = {
        id: 1,
        folder_path: "/test",
        file_name: "test.jpg",
        file_path: "/test/test.jpg",
        file_size: 1024,
        mime_type: "image/jpeg",
        width: 800,
        height: 600,
        created_date: "2024-01-01",
        view_count: 5,
        last_viewed: null,
        like_count: 3,
        is_deleted: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValue(mockMedia);
      mockSqlService.execute.mockReturnValue({ changes: 1, lastInsertRowid: 1 });

      const result = mediaService.incrementViewCount(1);

      expect(result.view_count).toBe(6);
      expect(mockSqlService.execute).toHaveBeenCalledTimes(2); // UPDATE and INSERT
    });

    it("should throw when media not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => mediaService.incrementViewCount(999)).toThrow("Media file with id 999 not found");
    });
  });

  describe("incrementLikeCount", () => {
    it("should increment like count", () => {
      const mockMedia: MediaFile = {
        id: 1,
        folder_path: "/test",
        file_name: "test.jpg",
        file_path: "/test/test.jpg",
        file_size: 1024,
        mime_type: "image/jpeg",
        width: 800,
        height: 600,
        created_date: "2024-01-01",
        view_count: 5,
        last_viewed: null,
        like_count: 3,
        is_deleted: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValue(mockMedia);
      mockSqlService.execute.mockReturnValue({ changes: 1, lastInsertRowid: 1 });

      const result = mediaService.incrementLikeCount(1);

      expect(result.like_count).toBe(4);
    });

    it("should throw when media not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => mediaService.incrementLikeCount(999)).toThrow("Media file with id 999 not found");
    });
  });

  describe("setDislike", () => {
    it("should set like count to -1", () => {
      const mockMedia: MediaFile = {
        id: 1,
        folder_path: "/test",
        file_name: "test.jpg",
        file_path: "/test/test.jpg",
        file_size: 1024,
        mime_type: "image/jpeg",
        width: 800,
        height: 600,
        created_date: "2024-01-01",
        view_count: 5,
        last_viewed: null,
        like_count: 3,
        is_deleted: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValue(mockMedia);
      mockSqlService.execute.mockReturnValue({ changes: 1, lastInsertRowid: 1 });

      const result = mediaService.setDislike(1);

      expect(result.like_count).toBe(-1);
    });

    it("should throw when media not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => mediaService.setDislike(999)).toThrow("Media file with id 999 not found");
    });
  });

  describe("addTagToMedia", () => {
    it("should create new tag and add to media", () => {
      const mockTag: Tag = {
        id: 1,
        name: "nature",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne
        .mockReturnValueOnce({ id: 1 }) // media exists
        .mockReturnValueOnce(undefined) // tag doesn't exist
        .mockReturnValueOnce(mockTag) // newly created tag
        .mockReturnValueOnce(undefined); // relationship doesn't exist

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = mediaService.addTagToMedia(1, "nature");

      expect(result.name).toBe("nature");
      expect(mockSqlService.execute).toHaveBeenCalledTimes(2); // INSERT tag, INSERT MediaTags
    });

    it("should add existing tag to media", () => {
      const mockTag: Tag = {
        id: 1,
        name: "nature",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne
        .mockReturnValueOnce({ id: 1 }) // media exists
        .mockReturnValueOnce(mockTag) // tag exists
        .mockReturnValueOnce(undefined); // relationship doesn't exist

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = mediaService.addTagToMedia(1, "nature");

      expect(result.name).toBe("nature");
      expect(mockSqlService.execute).toHaveBeenCalledTimes(1); // Only INSERT MediaTags
    });

    it("should throw if tag already on media", () => {
      const mockTag: Tag = {
        id: 1,
        name: "nature",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne
        .mockReturnValueOnce({ id: 1 }) // media exists
        .mockReturnValueOnce(mockTag) // tag exists
        .mockReturnValueOnce({ media_id: 1, tag_id: 1 }); // relationship exists

      expect(() => mediaService.addTagToMedia(1, "nature")).toThrow("Tag already applied to media");
    });

    it("should throw when media not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => mediaService.addTagToMedia(999, "nature")).toThrow("Media file with id 999 not found");
    });
  });

  describe("removeTagFromMedia", () => {
    it("should remove tag from media", () => {
      mockSqlService.queryOne.mockReturnValue({ media_id: 1, tag_id: 1 });
      mockSqlService.execute.mockReturnValue({ changes: 1, lastInsertRowid: 1 });

      const result = mediaService.removeTagFromMedia(1, 1);

      expect(result.success).toBe(true);
    });

    it("should throw when tag not on media", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => mediaService.removeTagFromMedia(1, 1)).toThrow("Tag 1 not found on media 1");
    });
  });

  describe("getAllTags", () => {
    it("should return all tags", () => {
      const mockTags: Tag[] = [
        { id: 1, name: "nature", created_at: "2024-01-01T00:00:00Z" },
        { id: 2, name: "sunset", created_at: "2024-01-01T00:00:00Z" },
      ];

      mockSqlService.queryAll.mockReturnValue(mockTags);

      const result = mediaService.getAllTags();

      expect(result).toHaveLength(2);
    });

    it("should throw on database errors", () => {
      mockSqlService.queryAll.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => mediaService.getAllTags()).toThrow("Database error");
    });
  });

  describe("createTag", () => {
    it("should create a new tag", () => {
      const mockTag: Tag = {
        id: 1,
        name: "nature",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne
        .mockReturnValueOnce(undefined) // tag doesn't exist
        .mockReturnValueOnce(mockTag); // newly created tag

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = mediaService.createTag("nature");

      expect(result.name).toBe("nature");
    });

    it("should return existing tag if it already exists", () => {
      const mockTag: Tag = {
        id: 1,
        name: "nature",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValue(mockTag);

      const result = mediaService.createTag("nature");

      expect(result.name).toBe("nature");
      expect(result.id).toBe(1);
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);
      mockSqlService.execute.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => mediaService.createTag("nature")).toThrow("Database error");
    });
  });

  describe("getTagsForMedia", () => {
    it("should return tags for a media file", () => {
      const mockTags: Tag[] = [{ id: 1, name: "nature", created_at: "2024-01-01T00:00:00Z" }];

      mockSqlService.queryAll.mockReturnValue(mockTags);

      const result = mediaService.getTagsForMedia(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("nature");
    });

    it("should return empty array on error", () => {
      mockSqlService.queryAll.mockImplementation(() => {
        throw new Error("Database error");
      });

      const result = mediaService.getTagsForMedia(1);

      expect(result).toHaveLength(0);
    });
  });
});
