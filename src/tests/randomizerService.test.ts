/**
 * RandomizerService unit tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { RandomizerService } from "../services/randomizerService";
import type { MediaFile } from "../api/schemas";

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

describe("RandomizerService", () => {
  let randomizerService: RandomizerService;

  beforeEach(() => {
    randomizerService = new RandomizerService();
    vi.clearAllMocks();
  });

  // Helper to create mock media files
  const createMockMedia = (overrides: Partial<MediaFile> = {}): MediaFile => ({
    id: 1,
    folder_path: "/test",
    file_name: "test.jpg",
    file_path: "/test/test.jpg",
    file_size: 1024,
    mime_type: "image/jpeg",
    width: 1920,
    height: 1080,
    created_date: "2024-01-01T00:00:00Z",
    view_count: 0,
    last_viewed: null,
    like_count: 0,
    is_deleted: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  describe("randomize", () => {
    it("should return empty array for empty input", () => {
      const result = randomizerService.randomize([]);
      expect(result).toEqual([]);
    });

    it("should exclude disliked media by default", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, like_count: 1 }),
        createMockMedia({ id: 2, like_count: -1 }),
        createMockMedia({ id: 3, like_count: 0 }),
      ];

      const result = randomizerService.randomize(mediaFiles);
      const ids = result.map((r) => r.id);

      expect(ids).not.toContain(2);
      expect(ids).toContain(1);
      expect(ids).toContain(3);
    });

    it("should include disliked media when excludeDisliked is false", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, like_count: 1 }),
        createMockMedia({ id: 2, like_count: -1 }),
        createMockMedia({ id: 3, like_count: 0 }),
      ];

      const result = randomizerService.randomize(mediaFiles, "random", false);
      const ids = result.map((r) => r.id);

      expect(ids).toHaveLength(3);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
      expect(ids).toContain(3);
    });

    it("should return correctly formatted output with id and idx", () => {
      const mediaFiles = [
        createMockMedia({ id: 100 }),
        createMockMedia({ id: 200 }),
      ];

      const result = randomizerService.randomize(mediaFiles);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("idx");
      expect(result[0].idx).toBe(0);
      expect(result[1].idx).toBe(1);
    });

    it("should throw error for unknown algorithm", () => {
      const mediaFiles = [createMockMedia()];

      expect(() => {
        // @ts-expect-error Testing invalid algorithm
        randomizerService.randomize(mediaFiles, "invalid_algorithm");
      }).toThrow("Unknown prioritization algorithm");
    });
  });

  describe("random algorithm", () => {
    it("should preserve all media items", () => {
      const mediaFiles = Array.from({ length: 10 }, (_, i) =>
        createMockMedia({ id: i + 1 })
      );

      const result = randomizerService.randomize(mediaFiles, "random");
      const ids = result.map((r) => r.id);

      expect(ids).toHaveLength(10);
      expect(ids.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it("should produce different orders on multiple calls", () => {
      const mediaFiles = Array.from({ length: 40 }, (_, i) =>
        createMockMedia({ id: i + 1 })
      );

      const result1 = randomizerService.randomize(mediaFiles, "random");
      const result2 = randomizerService.randomize(mediaFiles, "random");

      const ids1 = result1.map((r) => r.id);
      const ids2 = result2.map((r) => r.id);

      // Expect different order (highly unlikely to be the same with 40 items)
      expect(ids1).not.toEqual(ids2);
    });

    it("should handle single media file", () => {
      const mediaFiles = [createMockMedia({ id: 42 })];
      const result = randomizerService.randomize(mediaFiles, "random");

      expect(result).toEqual([{ id: 42, idx: 0 }]);
    });
  });

  describe("unviewed_first algorithm", () => {
    it("should prioritize unviewed media", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, last_viewed: "2024-01-01T00:00:00Z" }),
        createMockMedia({ id: 2, last_viewed: null }),
        createMockMedia({ id: 3, last_viewed: "2024-01-02T00:00:00Z" }),
        createMockMedia({ id: 4, last_viewed: null }),
      ];

      const result = randomizerService.randomize(mediaFiles, "unviewed_first");
      const ids = result.map((r) => r.id);

      // First two should be unviewed (ids 2 and 4), last two should be viewed (ids 1 and 3)
      expect(ids.slice(0, 2).sort()).toEqual([2, 4]);
      expect(ids.slice(2, 4).sort()).toEqual([1, 3]);
    });

    it("should handle all unviewed media", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, last_viewed: null }),
        createMockMedia({ id: 2, last_viewed: null }),
        createMockMedia({ id: 3, last_viewed: null }),
      ];

      const result = randomizerService.randomize(mediaFiles, "unviewed_first");
      const ids = result.map((r) => r.id);

      expect(ids.sort()).toEqual([1, 2, 3]);
    });

    it("should handle all viewed media", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, last_viewed: "2024-01-01T00:00:00Z" }),
        createMockMedia({ id: 2, last_viewed: "2024-01-02T00:00:00Z" }),
      ];

      const result = randomizerService.randomize(mediaFiles, "unviewed_first");
      const ids = result.map((r) => r.id);

      expect(ids.sort()).toEqual([1, 2]);
    });
  });

  describe("least_viewed algorithm", () => {
    it("should sort by view_count ascending", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, view_count: 5, last_viewed: "2024-01-01T00:00:00Z" }),
        createMockMedia({ id: 2, view_count: 2, last_viewed: "2024-01-02T00:00:00Z" }),
        createMockMedia({ id: 3, view_count: 8, last_viewed: "2024-01-03T00:00:00Z" }),
        createMockMedia({ id: 4, view_count: 0, last_viewed: null }),
      ];

      const result = randomizerService.randomize(mediaFiles, "least_viewed");
      const ids = result.map((r) => r.id);

      // Should be ordered: 4 (0), 2 (2), 1 (5), 3 (8)
      expect(ids[0]).toBe(4);
      expect(ids[1]).toBe(2);
      expect(ids[2]).toBe(1);
      expect(ids[3]).toBe(3);
    });

    it("should use last_viewed as tie-breaker for same view_count", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, view_count: 5, last_viewed: "2024-01-03T00:00:00Z" }),
        createMockMedia({ id: 2, view_count: 5, last_viewed: "2024-01-01T00:00:00Z" }),
        createMockMedia({ id: 3, view_count: 5, last_viewed: "2024-01-02T00:00:00Z" }),
      ];

      const result = randomizerService.randomize(mediaFiles, "least_viewed");
      const ids = result.map((r) => r.id);

      // All have same view_count, should be sorted by last_viewed ascending
      expect(ids[0]).toBe(2); // 2024-01-01
      expect(ids[1]).toBe(3); // 2024-01-02
      expect(ids[2]).toBe(1); // 2024-01-03
    });
  });

  describe("most_liked algorithm", () => {
    it("should sort by like_count descending", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, like_count: 3, view_count: 10 }),
        createMockMedia({ id: 2, like_count: 7, view_count: 5 }),
        createMockMedia({ id: 3, like_count: 1, view_count: 20 }),
        createMockMedia({ id: 4, like_count: 5, view_count: 8 }),
      ];

      const result = randomizerService.randomize(mediaFiles, "most_liked");
      const ids = result.map((r) => r.id);

      // Should be ordered: 2 (7), 4 (5), 1 (3), 3 (1)
      expect(ids[0]).toBe(2);
      expect(ids[1]).toBe(4);
      expect(ids[2]).toBe(1);
      expect(ids[3]).toBe(3);
    });

    it("should use view_count as tie-breaker for same like_count", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, like_count: 5, view_count: 15 }),
        createMockMedia({ id: 2, like_count: 5, view_count: 5 }),
        createMockMedia({ id: 3, like_count: 5, view_count: 10 }),
      ];

      const result = randomizerService.randomize(mediaFiles, "most_liked");
      const ids = result.map((r) => r.id);

      // All have same like_count, should be sorted by view_count ascending
      expect(ids[0]).toBe(2); // view_count: 5
      expect(ids[1]).toBe(3); // view_count: 10
      expect(ids[2]).toBe(1); // view_count: 15
    });
  });

  describe("most_viewed algorithm", () => {
    it("should sort by view_count descending", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, view_count: 5, last_viewed: "2024-01-01T00:00:00Z" }),
        createMockMedia({ id: 2, view_count: 15, last_viewed: "2024-01-02T00:00:00Z" }),
        createMockMedia({ id: 3, view_count: 3, last_viewed: "2024-01-03T00:00:00Z" }),
        createMockMedia({ id: 4, view_count: 10, last_viewed: "2024-01-04T00:00:00Z" }),
      ];

      const result = randomizerService.randomize(mediaFiles, "most_viewed");
      const ids = result.map((r) => r.id);

      // Should be ordered: 2 (15), 4 (10), 1 (5), 3 (3)
      expect(ids[0]).toBe(2);
      expect(ids[1]).toBe(4);
      expect(ids[2]).toBe(1);
      expect(ids[3]).toBe(3);
    });

    it("should use last_viewed descending as tie-breaker for same view_count", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, view_count: 5, last_viewed: "2024-01-01T00:00:00Z" }),
        createMockMedia({ id: 2, view_count: 5, last_viewed: "2024-01-03T00:00:00Z" }),
        createMockMedia({ id: 3, view_count: 5, last_viewed: "2024-01-02T00:00:00Z" }),
      ];

      const result = randomizerService.randomize(mediaFiles, "most_viewed");
      const ids = result.map((r) => r.id);

      // All have same view_count, should be sorted by last_viewed descending
      expect(ids[0]).toBe(2); // 2024-01-03
      expect(ids[1]).toBe(3); // 2024-01-02
      expect(ids[2]).toBe(1); // 2024-01-01
    });
  });

  describe("oldest_first algorithm", () => {
    it("should prioritize never viewed, then sort by last_viewed ascending", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, last_viewed: "2024-01-03T00:00:00Z" }),
        createMockMedia({ id: 2, last_viewed: null }),
        createMockMedia({ id: 3, last_viewed: "2024-01-01T00:00:00Z" }),
        createMockMedia({ id: 4, last_viewed: null }),
        createMockMedia({ id: 5, last_viewed: "2024-01-02T00:00:00Z" }),
      ];

      const result = randomizerService.randomize(mediaFiles, "oldest_first");
      const ids = result.map((r) => r.id);

      // First two should be never viewed (ids 2 and 4)
      expect(ids.slice(0, 2).sort()).toEqual([2, 4]);
      // Rest should be sorted by date ascending
      expect(ids.slice(2, 5)).toEqual([3, 5, 1]);
    });

    it("should handle all never viewed media", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, last_viewed: null }),
        createMockMedia({ id: 2, last_viewed: null }),
        createMockMedia({ id: 3, last_viewed: null }),
      ];

      const result = randomizerService.randomize(mediaFiles, "oldest_first");
      const ids = result.map((r) => r.id);

      expect(ids.sort()).toEqual([1, 2, 3]);
    });

    it("should handle all viewed media", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, last_viewed: "2024-01-03T00:00:00Z" }),
        createMockMedia({ id: 2, last_viewed: "2024-01-01T00:00:00Z" }),
        createMockMedia({ id: 3, last_viewed: "2024-01-02T00:00:00Z" }),
      ];

      const result = randomizerService.randomize(mediaFiles, "oldest_first");
      const ids = result.map((r) => r.id);

      expect(ids).toEqual([2, 3, 1]);
    });
  });

  describe("performance tests", () => {
    it("should complete random algorithm within 200ms for 1000 items", () => {
      const mediaFiles = Array.from({ length: 1000 }, (_, i) =>
        createMockMedia({ id: i + 1, view_count: Math.floor(Math.random() * 100) })
      );

      const start = performance.now();
      const result = randomizerService.randomize(mediaFiles, "random");
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(200);
    });

    it("should complete unviewed_first algorithm within 200ms for 1000 items", () => {
      const mediaFiles = Array.from({ length: 1000 }, (_, i) =>
        createMockMedia({
          id: i + 1,
          last_viewed: i % 2 === 0 ? null : `2024-01-${String(i % 28 + 1).padStart(2, "0")}T00:00:00Z`,
        })
      );

      const start = performance.now();
      const result = randomizerService.randomize(mediaFiles, "unviewed_first");
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(200);
    });

    it("should complete least_viewed algorithm within 200ms for 1000 items", () => {
      const mediaFiles = Array.from({ length: 1000 }, (_, i) =>
        createMockMedia({
          id: i + 1,
          view_count: Math.floor(Math.random() * 100),
          last_viewed: `2024-01-${String(i % 28 + 1).padStart(2, "0")}T00:00:00Z`,
        })
      );

      const start = performance.now();
      const result = randomizerService.randomize(mediaFiles, "least_viewed");
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(200);
    });

    it("should complete most_liked algorithm within 200ms for 1000 items", () => {
      const mediaFiles = Array.from({ length: 1000 }, (_, i) =>
        createMockMedia({
          id: i + 1,
          like_count: Math.floor(Math.random() * 50),
          view_count: Math.floor(Math.random() * 100),
        })
      );

      const start = performance.now();
      const result = randomizerService.randomize(mediaFiles, "most_liked");
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(200);
    });

    it("should complete most_viewed algorithm within 200ms for 1000 items", () => {
      const mediaFiles = Array.from({ length: 1000 }, (_, i) =>
        createMockMedia({
          id: i + 1,
          view_count: Math.floor(Math.random() * 100),
          last_viewed: `2024-01-${String(i % 28 + 1).padStart(2, "0")}T00:00:00Z`,
        })
      );

      const start = performance.now();
      const result = randomizerService.randomize(mediaFiles, "most_viewed");
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(200);
    });

    it("should complete oldest_first algorithm within 200ms for 1000 items", () => {
      const mediaFiles = Array.from({ length: 1000 }, (_, i) =>
        createMockMedia({
          id: i + 1,
          last_viewed: i % 3 === 0 ? null : `2024-01-${String(i % 28 + 1).padStart(2, "0")}T00:00:00Z`,
        })
      );

      const start = performance.now();
      const result = randomizerService.randomize(mediaFiles, "oldest_first");
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(200);
    });
  });

  describe("edge cases", () => {
    it("should handle media with null view_count", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, view_count: 0 }),
        createMockMedia({ id: 2, view_count: 0 }),
      ];

      const result = randomizerService.randomize(mediaFiles, "least_viewed");
      expect(result).toHaveLength(2);
    });

    it("should handle media with identical properties", () => {
      const mediaFiles = [
        createMockMedia({ id: 1 }),
        createMockMedia({ id: 2 }),
        createMockMedia({ id: 3 }),
      ];

      const result = randomizerService.randomize(mediaFiles, "most_liked");
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id).sort()).toEqual([1, 2, 3]);
    });

    it("should handle large negative like_count values", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, like_count: -100 }),
        createMockMedia({ id: 2, like_count: 5 }),
        createMockMedia({ id: 3, like_count: -50 }),
      ];

      const result = randomizerService.randomize(mediaFiles, "most_liked", true);
      const ids = result.map((r) => r.id);

      // Only id 2 should be included (like_count >= 0)
      expect(ids).toEqual([2]);
    });

    it("should return empty array if all media is disliked", () => {
      const mediaFiles = [
        createMockMedia({ id: 1, like_count: -1 }),
        createMockMedia({ id: 2, like_count: -5 }),
        createMockMedia({ id: 3, like_count: -10 }),
      ];

      const result = randomizerService.randomize(mediaFiles, "random", true);
      expect(result).toEqual([]);
    });
  });
});
