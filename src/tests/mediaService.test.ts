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

      const mockTags: Tag[] = [
        { id: 1, name: "nature", created_at: "2024-01-01T00:00:00Z" },
      ];

      mockSqlService.queryAll
        .mockReturnValueOnce(mockMediaFiles)
        .mockReturnValueOnce(mockTags);

      const result = mediaService.getMediaFiles({
        sort: "created_date_desc",
        limit: 30,
        offset: 0,
      });

      expect(result.status).toBe(200);
      expect(result.message).toContain("Successfully retrieved 1 media files");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags).toEqual(mockTags);
    });

    it("should return empty array when no media files found", () => {
      mockSqlService.queryAll.mockReturnValue([]);

      const result = mediaService.getMediaFiles({
        sort: "created_date_desc",
        limit: 30,
        offset: 0,
      });

      expect(result.status).toBe(200);
      expect(result.data).toHaveLength(0);
    });

    it("should handle errors and return 500 status", () => {
      mockSqlService.queryAll.mockImplementation(() => {
        throw new Error("Database error");
      });

      const result = mediaService.getMediaFiles({
        sort: "created_date_desc",
        limit: 30,
        offset: 0,
      });

      expect(result.status).toBe(500);
      expect(result.message).toBe("Failed to fetch media files");
      expect(result.data).toHaveLength(0);
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

      const mockTags: Tag[] = [
        { id: 1, name: "nature", created_at: "2024-01-01T00:00:00Z" },
      ];

      mockSqlService.queryOne.mockReturnValue(mockMedia);
      mockSqlService.queryAll.mockReturnValue(mockTags);

      const result = mediaService.getMediaFileById(1);

      expect(result.status).toBe(200);
      expect(result.message).toBe("Successfully retrieved media file");
      expect(result.data?.id).toBe(1);
      expect(result.data?.tags).toEqual(mockTags);
    });

    it("should return 404 when media file not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      const result = mediaService.getMediaFileById(999);

      expect(result.status).toBe(404);
      expect(result.message).toBe("Media file not found");
      expect(result.data).toBeNull();
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

      expect(result.status).toBe(200);
      expect(result.message).toBe("View count incremented successfully");
      expect(result.data.view_count).toBe(6);
      expect(mockSqlService.execute).toHaveBeenCalledTimes(2); // UPDATE and INSERT
    });

    it("should return 404 when media not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      const result = mediaService.incrementViewCount(999);

      expect(result.status).toBe(404);
      expect(result.message).toBe("Media file not found");
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

      expect(result.status).toBe(200);
      expect(result.message).toBe("Like count incremented successfully");
      expect(result.data.like_count).toBe(4);
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

      expect(result.status).toBe(200);
      expect(result.message).toBe("Dislike set successfully");
      expect(result.data.like_count).toBe(-1);
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

      expect(result.status).toBe(200);
      expect(result.message).toBe("Tag added to media successfully");
      expect(result.data.tag.name).toBe("nature");
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

      expect(result.status).toBe(200);
      expect(mockSqlService.execute).toHaveBeenCalledTimes(1); // Only INSERT MediaTags
    });

    it("should return 409 if tag already on media", () => {
      const mockTag: Tag = {
        id: 1,
        name: "nature",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne
        .mockReturnValueOnce({ id: 1 }) // media exists
        .mockReturnValueOnce(mockTag) // tag exists
        .mockReturnValueOnce({ media_id: 1, tag_id: 1 }); // relationship exists

      const result = mediaService.addTagToMedia(1, "nature");

      expect(result.status).toBe(409);
      expect(result.message).toBe("Tag already applied to this media");
    });

    it("should return 404 when media not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      const result = mediaService.addTagToMedia(999, "nature");

      expect(result.status).toBe(404);
      expect(result.message).toBe("Media file not found");
    });
  });

  describe("removeTagFromMedia", () => {
    it("should remove tag from media", () => {
      mockSqlService.queryOne.mockReturnValue({ media_id: 1, tag_id: 1 });
      mockSqlService.execute.mockReturnValue({ changes: 1, lastInsertRowid: 1 });

      const result = mediaService.removeTagFromMedia(1, 1);

      expect(result.status).toBe(200);
      expect(result.message).toBe("Tag removed from media successfully");
      expect(result.data.success).toBe(true);
    });

    it("should return 404 when tag not on media", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      const result = mediaService.removeTagFromMedia(1, 1);

      expect(result.status).toBe(404);
      expect(result.message).toBe("Tag not found on this media");
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

      expect(result.status).toBe(200);
      expect(result.message).toContain("Successfully retrieved 2 tags");
      expect(result.data).toHaveLength(2);
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

      expect(result.status).toBe(201);
      expect(result.message).toBe("Tag created successfully");
      expect(result.data?.name).toBe("nature");
    });

    it("should return 409 if tag already exists", () => {
      const mockTag: Tag = {
        id: 1,
        name: "nature",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValue(mockTag);

      const result = mediaService.createTag("nature");

      expect(result.status).toBe(409);
      expect(result.message).toBe("Tag already exists");
      expect(result.data).toBeNull();
    });
  });

  describe("getTagsForMedia", () => {
    it("should return tags for a media file", () => {
      const mockTags: Tag[] = [
        { id: 1, name: "nature", created_at: "2024-01-01T00:00:00Z" },
      ];

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
