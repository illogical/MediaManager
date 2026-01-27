/**
 * HistoryService unit tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { HistoryService } from "../services/historyService";
import { sqlService } from "../services/sqlService";
import type { ViewHistory } from "../api/schemas";

// Mock the sqlService
vi.mock("../services/sqlService", () => {
  return {
    sqlService: {
      queryAll: vi.fn(),
    },
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

describe("HistoryService", () => {
  let historyService: HistoryService;
  const mockSqlService = vi.mocked(sqlService);

  beforeEach(() => {
    historyService = new HistoryService();
    vi.clearAllMocks();
  });

  describe("getViewHistory", () => {
    it("should return view history with default limit", () => {
      const mockHistory: ViewHistory[] = [
        {
          id: 1,
          media_id: 1,
          viewed_at: "2024-01-01T12:00:00Z",
          file_name: "test1.jpg",
          file_path: "/test/test1.jpg",
        },
        {
          id: 2,
          media_id: 2,
          viewed_at: "2024-01-01T11:00:00Z",
          file_name: "test2.jpg",
          file_path: "/test/test2.jpg",
        },
      ];

      mockSqlService.queryAll.mockReturnValue(mockHistory);

      const result = historyService.getViewHistory();

      expect(result).toHaveLength(2);
      expect(result[0].file_name).toBe("test1.jpg");
    });

    it("should return view history with custom limit", () => {
      const mockHistory: ViewHistory[] = [];
      for (let i = 1; i <= 50; i++) {
        mockHistory.push({
          id: i,
          media_id: i,
          viewed_at: `2024-01-01T${String(i).padStart(2, "0")}:00:00Z`,
          file_name: `test${i}.jpg`,
          file_path: `/test/test${i}.jpg`,
        });
      }

      mockSqlService.queryAll.mockReturnValue(mockHistory);

      const result = historyService.getViewHistory(50);

      expect(result).toHaveLength(50);
    });

    it("should return empty array when no history found", () => {
      mockSqlService.queryAll.mockReturnValue([]);

      const result = historyService.getViewHistory();

      expect(result).toHaveLength(0);
    });

    it("should throw error when database query fails", () => {
      mockSqlService.queryAll.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => historyService.getViewHistory()).toThrow("Database error");
    });
  });
});
