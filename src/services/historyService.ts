/**
 * History Service - Handles view history operations
 */

import { sqlService } from "./sqlService";
import { logService } from "./logService";
import type { ViewHistory, ApiResponse } from "../api/schemas";

export class HistoryService {
  /**
   * Get last 20 viewed items
   */
  getViewHistory(limit: number = 20): ApiResponse<ViewHistory[]> {
    logService.trace(`HistoryService.getViewHistory(${limit}) called`);

    try {
      const results = sqlService.queryAll<ViewHistory>(
        `
        SELECT 
          vh.id, 
          vh.media_id, 
          vh.viewed_at,
          m.file_name,
          m.file_path
        FROM ViewHistory vh
        JOIN MediaFiles m ON vh.media_id = m.id
        WHERE m.is_deleted = 0
        ORDER BY vh.viewed_at DESC
        LIMIT ?
      `,
        [limit]
      );

      logService.info(`Retrieved ${results.length} history entries`);

      return {
        status: 200,
        data: results,
      };
    } catch (error) {
      logService.error("Failed to fetch view history", error as Error);
      return {
        status: 500,
        data: [],
      };
    }
  }
}

// Export singleton instance
export const historyService = new HistoryService();
